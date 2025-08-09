import { execCommand } from './exec.js';
import { log, LogLevel } from './log.js';

export interface VercelProject {
  projectId: string;
  name: string;
  url: string;
  framework: string;
  createdAt: string;
}

export interface VercelDeployment {
  url: string;
  deploymentId: string;
  projectId: string;
  state: string;
  createdAt: string;
}

export async function checkVercelAuth(): Promise<boolean> {
  try {
    await execCommand('vercel whoami', { silent: true });
    return true;
  } catch {
    return false;
  }
}

export async function loginToVercel(): Promise<void> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error('VERCEL_TOKEN environment variable is required');
  }
  
  const isAuthed = await checkVercelAuth();
  if (!isAuthed) {
    // Login using token
    await execCommand(`vercel login --token ${token}`);
    log('Vercel authentication configured', LogLevel.DEBUG);
  } else {
    log('Vercel authentication verified', LogLevel.DEBUG);
  }
}

export async function createOrLinkProject(
  projectPath: string,
  projectName: string,
  org?: string
): Promise<string> {
  await loginToVercel();
  
  const cleanName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  
  try {
    // Try to link to existing project
    const linkCmd = org ? 
      `vercel link --project ${cleanName} --scope ${org} --yes` :
      `vercel link --project ${cleanName} --yes`;
      
    await execCommand(linkCmd, { cwd: projectPath });
    log(`Linked to existing Vercel project: ${cleanName}`, LogLevel.DEBUG);
    
    return cleanName;
  } catch {
    // Project doesn't exist, it will be created on first deploy
    log(`Will create new Vercel project: ${cleanName}`, LogLevel.DEBUG);
    return cleanName;
  }
}

export async function deployToVercel(
  projectPath: string,
  projectName: string,
  org?: string
): Promise<VercelDeployment> {
  await loginToVercel();
  
  const cleanName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  
  // Deploy to production
  const deployCmd = org ? 
    `vercel deploy --prod --confirm --scope ${org} --name ${cleanName}` :
    `vercel deploy --prod --confirm --name ${cleanName}`;
    
  const result = await execCommand(deployCmd, { cwd: projectPath });
  
  // Extract deployment URL from output
  const urlMatch = result.match(/https:\/\/[^\s]+/);
  if (!urlMatch) {
    throw new Error('Failed to extract deployment URL from Vercel CLI output');
  }
  
  const url = urlMatch[0];
  log(`Deployed to Vercel: ${url}`, LogLevel.DEBUG);
  
  // Get deployment details
  const deploymentId = url.split('//')[1].split('.')[0]; // Extract from subdomain
  
  return {
    url,
    deploymentId,
    projectId: cleanName,
    state: 'READY',
    createdAt: new Date().toISOString()
  };
}

export async function setVercelEnvs(
  projectName: string,
  envVars: Record<string, string>,
  environment: 'production' | 'preview' | 'development' = 'production'
): Promise<void> {
  const cleanName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  
  log('Setting Vercel environment variables...', LogLevel.DEBUG);
  
  for (const [key, value] of Object.entries(envVars)) {
    try {
      await execCommand(`vercel env add ${key} ${environment} --project ${cleanName}`, {
        env: { VERCEL_ENV_VALUE: value }
      });
      log(`Set environment variable: ${key}`, LogLevel.DEBUG);
    } catch (error) {
      // Try to update existing variable
      try {
        await execCommand(`vercel env rm ${key} ${environment} --project ${cleanName} --yes`);
        await execCommand(`vercel env add ${key} ${environment} --project ${cleanName}`, {
          env: { VERCEL_ENV_VALUE: value }
        });
        log(`Updated environment variable: ${key}`, LogLevel.DEBUG);
      } catch (updateError) {
        log(`Failed to set environment variable ${key}`, LogLevel.WARN);
      }
    }
  }
}

export async function getProject(projectName: string): Promise<VercelProject | null> {
  try {
    const result = await execCommand(`vercel project ls --output json`);
    const projects = JSON.parse(result).projects;
    
    const project = projects.find((p: any) => p.name === projectName);
    if (!project) {
      return null;
    }
    
    return {
      projectId: project.id,
      name: project.name,
      url: `https://${project.name}.vercel.app`,
      framework: project.framework,
      createdAt: project.createdAt
    };
  } catch {
    return null;
  }
}

export async function listDeployments(projectName: string, limit: number = 10): Promise<VercelDeployment[]> {
  const result = await execCommand(`vercel deployment ls --project ${projectName} --limit ${limit} --output json`);
  const deployments = JSON.parse(result).deployments;
  
  return deployments.map((d: any) => ({
    url: d.url,
    deploymentId: d.uid,
    projectId: d.projectId,
    state: d.state,
    createdAt: d.createdAt
  }));
}

export async function getDeployment(deploymentId: string): Promise<VercelDeployment> {
  const result = await execCommand(`vercel deployment inspect ${deploymentId} --output json`);
  const deployment = JSON.parse(result);
  
  return {
    url: deployment.url,
    deploymentId: deployment.uid,
    projectId: deployment.projectId,
    state: deployment.state,
    createdAt: deployment.createdAt
  };
}

export async function cancelDeployment(deploymentId: string): Promise<void> {
  await execCommand(`vercel deployment cancel ${deploymentId}`);
  log(`Deployment ${deploymentId} cancelled`, LogLevel.DEBUG);
}

export async function promoteDeployment(deploymentId: string): Promise<void> {
  await execCommand(`vercel deployment promote ${deploymentId}`);
  log(`Deployment ${deploymentId} promoted to production`, LogLevel.DEBUG);
}

export async function getDomains(projectName: string): Promise<string[]> {
  try {
    const result = await execCommand(`vercel domain ls --project ${projectName} --output json`);
    const domains = JSON.parse(result).domains;
    return domains.map((d: any) => d.name);
  } catch {
    return [];
  }
}

export async function addDomain(projectName: string, domain: string): Promise<void> {
  await execCommand(`vercel domain add ${domain} --project ${projectName}`);
  log(`Domain ${domain} added to project ${projectName}`, LogLevel.DEBUG);
}

export async function buildProject(projectPath: string): Promise<void> {
  log('Building project locally...', LogLevel.DEBUG);
  await execCommand('vercel build', { cwd: projectPath });
  log('Project built successfully', LogLevel.DEBUG);
}

export async function pullEnv(projectPath: string, environment: string = 'production'): Promise<void> {
  await execCommand(`vercel env pull .env.local --environment ${environment}`, { cwd: projectPath });
  log(`Environment variables pulled for ${environment}`, LogLevel.DEBUG);
}