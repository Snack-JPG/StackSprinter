import { execCommand } from './exec.js';
import { log, LogLevel } from './log.js';

export interface SupabaseProject {
  projectRef: string;
  url: string;
  anonKey: string;
  region: string;
  name: string;
}

export async function checkSupabaseAuth(): Promise<boolean> {
  try {
    await execCommand('supabase projects list', { silent: true });
    return true;
  } catch {
    return false;
  }
}

export async function loginToSupabase(): Promise<void> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    throw new Error('SUPABASE_ACCESS_TOKEN environment variable is required');
  }
  
  // Login using access token
  await execCommand(`supabase auth login --token ${token}`);
  log('Supabase authentication configured', LogLevel.DEBUG);
}

export async function createSupabaseProject(
  appName: string,
  org: string = 'default',
  region: string = 'us-east-1'
): Promise<SupabaseProject> {
  await loginToSupabase();
  
  const projectName = appName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const tag = `stacksprinter:${projectName}`;
  
  // Check if project already exists with our tag
  try {
    const existingProjects = await execCommand('supabase projects list --output json');
    const projects = JSON.parse(existingProjects);
    
    for (const project of projects) {
      if (project.name === projectName || (project.tags && project.tags.includes(tag))) {
        log(`Using existing Supabase project: ${project.id}`, LogLevel.DEBUG);
        
        const projectDetails = await getProjectDetails(project.id);
        return projectDetails;
      }
    }
  } catch (error) {
    log('Failed to check existing projects, creating new one', LogLevel.DEBUG);
  }
  
  // Create new project
  log(`Creating Supabase project: ${projectName}`, LogLevel.DEBUG);
  
  const createCmd = `supabase projects create ${projectName} --org-id ${org} --region ${region} --plan free`;
  const result = await execCommand(createCmd);
  
  // Parse project ID from output
  const projectIdMatch = result.match(/Created a new project (.+)/);
  if (!projectIdMatch) {
    throw new Error('Failed to extract project ID from Supabase CLI output');
  }
  
  const projectRef = projectIdMatch[1].trim();
  log(`Supabase project created: ${projectRef}`, LogLevel.DEBUG);
  
  // Get project details
  return await getProjectDetails(projectRef);
}

export async function getProjectDetails(projectRef: string): Promise<SupabaseProject> {
  const result = await execCommand(`supabase projects api-keys --project-ref ${projectRef} --output json`);
  const apiKeys = JSON.parse(result);
  
  const anonKey = apiKeys.find((key: any) => key.name === 'anon')?.api_key;
  if (!anonKey) {
    throw new Error('Failed to retrieve anonymous key from Supabase project');
  }
  
  // Get project info
  const projectInfo = await execCommand(`supabase projects list --output json`);
  const projects = JSON.parse(projectInfo);
  const project = projects.find((p: any) => p.id === projectRef);
  
  if (!project) {
    throw new Error(`Project ${projectRef} not found`);
  }
  
  const url = `https://${projectRef}.supabase.co`;
  
  return {
    projectRef,
    url,
    anonKey,
    region: project.region,
    name: project.name
  };
}

export async function runMigrations(projectRef: string): Promise<void> {
  log('Running Supabase migrations...', LogLevel.DEBUG);
  
  try {
    await execCommand(`supabase db push --project-ref ${projectRef} --include-all`);
    log('Migrations applied successfully', LogLevel.DEBUG);
  } catch (error) {
    // Try alternative approach for initial migration
    try {
      await execCommand(`supabase migration up --project-ref ${projectRef}`);
      log('Migrations applied successfully (alternative method)', LogLevel.DEBUG);
    } catch (alternativeError) {
      log('Failed to apply migrations with both methods', LogLevel.ERROR);
      throw error; // Throw original error
    }
  }
}

export async function seedDatabase(projectRef: string): Promise<void> {
  log('Seeding Supabase database...', LogLevel.DEBUG);
  
  try {
    await execCommand(`supabase db seed --project-ref ${projectRef}`);
    log('Database seeded successfully', LogLevel.DEBUG);
  } catch (error) {
    log('Failed to seed database (this is optional)', LogLevel.WARN);
  }
}

export async function resetDatabase(projectRef: string): Promise<void> {
  log('Resetting Supabase database...', LogLevel.DEBUG);
  
  await execCommand(`supabase db reset --project-ref ${projectRef} --confirm`);
  log('Database reset successfully', LogLevel.DEBUG);
}

export async function generateTypes(projectRef: string, outputPath: string = './types/supabase.ts'): Promise<void> {
  log('Generating TypeScript types...', LogLevel.DEBUG);
  
  await execCommand(`supabase gen types typescript --project-id ${projectRef} > ${outputPath}`);
  log(`Types generated at ${outputPath}`, LogLevel.DEBUG);
}

export async function runSQL(projectRef: string, sql: string): Promise<string> {
  // Create a temporary SQL file
  const { writeFileSync, unlinkSync } = await import('fs');
  const { join } = await import('path');
  const { tmpdir } = await import('os');
  
  const tempFile = join(tmpdir(), `stacksprinter-${Date.now()}.sql`);
  
  try {
    writeFileSync(tempFile, sql);
    const result = await execCommand(`supabase db reset --project-ref ${projectRef} --sql-file ${tempFile}`);
    return result;
  } finally {
    try {
      unlinkSync(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

export async function getProjectUrl(projectRef: string): Promise<string> {
  return `https://supabase.com/dashboard/project/${projectRef}`;
}

export async function listTables(projectRef: string): Promise<string[]> {
  const sql = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  
  const result = await execCommand(`supabase db query "${sql}" --project-ref ${projectRef} --output json`);
  const tables = JSON.parse(result);
  
  return tables.map((row: any) => row.table_name);
}

export async function checkConnection(projectRef: string): Promise<boolean> {
  try {
    await execCommand(`supabase db query "SELECT 1" --project-ref ${projectRef}`, { silent: true });
    return true;
  } catch {
    return false;
  }
}