import { execCommand } from './exec.js';
import { log, LogLevel } from './log.js';
import { existsSync } from 'fs';
import { resolve } from 'path';

export interface GitConfig {
  name?: string;
  email?: string;
}

export async function initGitRepo(projectPath: string): Promise<void> {
  const gitDir = resolve(projectPath, '.git');
  
  if (existsSync(gitDir)) {
    log('Git repository already initialized', LogLevel.DEBUG);
    return;
  }
  
  await execCommand('git init', { cwd: projectPath });
  log('Git repository initialized', LogLevel.DEBUG);
}

export async function getGitConfig(): Promise<GitConfig> {
  try {
    const name = await execCommand('git config --global user.name', { silent: true });
    const email = await execCommand('git config --global user.email', { silent: true });
    
    return { name: name.trim(), email: email.trim() };
  } catch {
    return {};
  }
}

export async function ensureGitConfig(): Promise<void> {
  const config = await getGitConfig();
  
  if (!config.name) {
    log('Git user.name not set. You may want to run: git config --global user.name "Your Name"', LogLevel.WARN);
  }
  
  if (!config.email) {
    log('Git user.email not set. You may want to run: git config --global user.email "your@email.com"', LogLevel.WARN);
  }
}

export async function addAllFiles(projectPath: string): Promise<void> {
  await execCommand('git add .', { cwd: projectPath });
  log('Files staged for commit', LogLevel.DEBUG);
}

export async function createCommit(projectPath: string, message: string): Promise<void> {
  try {
    await execCommand(`git commit -m "${message}"`, { cwd: projectPath });
    log('Initial commit created', LogLevel.DEBUG);
  } catch (error) {
    if (error instanceof Error && error.message.includes('nothing to commit')) {
      log('No changes to commit', LogLevel.DEBUG);
      return;
    }
    throw error;
  }
}

export async function addRemote(projectPath: string, name: string, url: string): Promise<void> {
  try {
    await execCommand(`git remote add ${name} ${url}`, { cwd: projectPath });
    log(`Remote '${name}' added`, LogLevel.DEBUG);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      // Update existing remote
      await execCommand(`git remote set-url ${name} ${url}`, { cwd: projectPath });
      log(`Remote '${name}' updated`, LogLevel.DEBUG);
    } else {
      throw error;
    }
  }
}

export async function pushToRemote(
  projectPath: string, 
  remote: string = 'origin', 
  branch: string = 'main'
): Promise<void> {
  // First push with upstream
  await execCommand(`git push -u ${remote} ${branch}`, { cwd: projectPath });
  log(`Code pushed to ${remote}/${branch}`, LogLevel.DEBUG);
}

export async function getCurrentBranch(projectPath: string): Promise<string> {
  try {
    return await execCommand('git branch --show-current', { cwd: projectPath, silent: true });
  } catch {
    return 'main'; // Default fallback
  }
}

export async function createBranch(projectPath: string, branchName: string): Promise<void> {
  const currentBranch = await getCurrentBranch(projectPath);
  
  if (currentBranch === branchName) {
    log(`Already on branch '${branchName}'`, LogLevel.DEBUG);
    return;
  }
  
  try {
    await execCommand(`git checkout -b ${branchName}`, { cwd: projectPath });
    log(`Created and switched to branch '${branchName}'`, LogLevel.DEBUG);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      await execCommand(`git checkout ${branchName}`, { cwd: projectPath });
      log(`Switched to existing branch '${branchName}'`, LogLevel.DEBUG);
    } else {
      throw error;
    }
  }
}

export async function getGitStatus(projectPath: string): Promise<string> {
  return await execCommand('git status --porcelain', { cwd: projectPath, silent: true });
}

export async function hasChanges(projectPath: string): Promise<boolean> {
  const status = await getGitStatus(projectPath);
  return status.trim().length > 0;
}

export async function getRemoteUrl(projectPath: string, remote: string = 'origin'): Promise<string | null> {
  try {
    return await execCommand(`git remote get-url ${remote}`, { cwd: projectPath, silent: true });
  } catch {
    return null;
  }
}

export async function createGitignore(projectPath: string): Promise<void> {
  const gitignoreContent = `# Dependencies
node_modules/
.pnpm-debug.log*

# Next.js
.next/
out/
build/
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# StackSprinter
.stacksprinter/
`;

  const { writeFileSync } = await import('fs');
  const gitignorePath = resolve(projectPath, '.gitignore');
  
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, gitignoreContent);
    log('.gitignore created', LogLevel.DEBUG);
  }
}