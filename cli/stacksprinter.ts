#!/usr/bin/env tsx

import { Command } from 'commander';
import { execCommand } from './lib/exec.js';
import { log, LogLevel } from './lib/log.js';
import { validateEnv, loadEnv } from './lib/env.js';
import { createGitHubRepo, pushToGitHub } from './lib/github.js';
import { createSupabaseProject, runMigrations, seedDatabase } from './lib/supabase.js';
import { deployToVercel, setVercelEnvs } from './lib/vercel.js';
import { scaffoldNextApp } from './lib/files.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

interface StackSprintOptions {
  appName: string;
  org: string;
  supabaseOrg: string;
  region: string;
  githubOrg: string;
  visibility: 'public' | 'private';
  verbose?: boolean;
}

interface StackSprintState {
  appName: string;
  supabaseProjectRef?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  githubRepoUrl?: string;
  vercelProjectId?: string;
  vercelUrl?: string;
  createdAt: string;
}

async function preflight(): Promise<void> {
  log('Running preflight checks...', LogLevel.INFO);
  
  const requiredTools = ['pnpm', 'node', 'gh', 'vercel', 'supabase', 'git', 'jq'];
  const missing: string[] = [];

  for (const tool of requiredTools) {
    try {
      await execCommand(`which ${tool}`);
    } catch {
      missing.push(tool);
    }
  }

  if (missing.length > 0) {
    log('Missing required tools:', LogLevel.ERROR);
    for (const tool of missing) {
      const installHint = getInstallHint(tool);
      log(`  - ${tool}: ${installHint}`, LogLevel.ERROR);
    }
    process.exit(1);
  }

  // Check Node version
  try {
    const nodeVersion = await execCommand('node --version');
    const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
    if (majorVersion < 18) {
      log(`Node.js version ${nodeVersion} is too old. Please install Node.js 18 or later.`, LogLevel.ERROR);
      process.exit(1);
    }
  } catch (error) {
    log('Failed to check Node.js version', LogLevel.ERROR);
    process.exit(1);
  }

  log('✅ All required tools are available', LogLevel.SUCCESS);
}

function getInstallHint(tool: string): string {
  const hints: Record<string, string> = {
    pnpm: 'npm install -g pnpm',
    node: 'Install from https://nodejs.org/',
    gh: 'Install from https://cli.github.com/',
    vercel: 'npm install -g vercel',
    supabase: 'Install from https://supabase.com/docs/guides/cli',
    git: 'Install from https://git-scm.com/',
    jq: 'brew install jq (macOS) or apt-get install jq (Linux)'
  };
  return hints[tool] || `Install ${tool} manually`;
}

async function saveState(state: StackSprintState, projectPath: string): Promise<void> {
  const stateDir = resolve(projectPath, '.stacksprinter');
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
  
  const statePath = resolve(stateDir, 'state.json');
  writeFileSync(statePath, JSON.stringify(state, null, 2));
  log(`State saved to ${statePath}`, LogLevel.DEBUG);
}

async function loadState(projectPath: string): Promise<StackSprintState | null> {
  const statePath = resolve(projectPath, '.stacksprinter', 'state.json');
  if (!existsSync(statePath)) {
    return null;
  }
  
  try {
    const stateContent = await import(statePath, { assert: { type: 'json' } });
    return stateContent.default;
  } catch {
    return null;
  }
}

async function stacksprint(options: StackSprintOptions): Promise<void> {
  const startTime = Date.now();
  const projectPath = resolve(process.cwd(), options.appName);
  
  log(`🚀 Starting StackSprinter for "${options.appName}"`, LogLevel.INFO);
  
  // Check if we have existing state for idempotency
  const existingState = await loadState(projectPath);
  const state: StackSprintState = existingState || {
    appName: options.appName,
    createdAt: new Date().toISOString()
  };

  try {
    // Step 1: Scaffold Next.js app
    if (!existsSync(projectPath)) {
      log('📁 Scaffolding Next.js application...', LogLevel.INFO);
      await scaffoldNextApp(options.appName, projectPath);
      log('✅ Next.js application scaffolded', LogLevel.SUCCESS);
    } else {
      log('📁 Using existing project directory', LogLevel.INFO);
    }

    // Step 2: Supabase setup
    if (!state.supabaseProjectRef) {
      log('🗄️  Setting up Supabase project...', LogLevel.INFO);
      const supabaseResult = await createSupabaseProject(options.appName, options.supabaseOrg, options.region);
      state.supabaseProjectRef = supabaseResult.projectRef;
      state.supabaseUrl = supabaseResult.url;
      state.supabaseAnonKey = supabaseResult.anonKey;
      
      await runMigrations(state.supabaseProjectRef);
      await seedDatabase(state.supabaseProjectRef);
      
      log('✅ Supabase project ready', LogLevel.SUCCESS);
      await saveState(state, projectPath);
    } else {
      log('🗄️  Using existing Supabase project', LogLevel.INFO);
    }

    // Step 3: GitHub repository
    if (!state.githubRepoUrl) {
      log('📚 Creating GitHub repository...', LogLevel.INFO);
      const repoUrl = await createGitHubRepo(options.appName, options.githubOrg, options.visibility);
      state.githubRepoUrl = repoUrl;
      
      await pushToGitHub(projectPath, repoUrl);
      log('✅ Code pushed to GitHub', LogLevel.SUCCESS);
      await saveState(state, projectPath);
    } else {
      log('📚 Using existing GitHub repository', LogLevel.INFO);
    }

    // Step 4: Vercel deployment
    if (!state.vercelProjectId) {
      log('🌐 Deploying to Vercel...', LogLevel.INFO);
      
      // Set environment variables
      await setVercelEnvs(options.appName, {
        NEXT_PUBLIC_SUPABASE_URL: state.supabaseUrl!,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: state.supabaseAnonKey!,
        SUPABASE_PROJECT_REF: state.supabaseProjectRef!
      });
      
      const vercelResult = await deployToVercel(projectPath, options.appName, options.org);
      state.vercelProjectId = vercelResult.projectId;
      state.vercelUrl = vercelResult.url;
      
      log('✅ Deployed to Vercel', LogLevel.SUCCESS);
      await saveState(state, projectPath);
    } else {
      log('🌐 Using existing Vercel deployment', LogLevel.INFO);
    }

    // Final report
    const duration = Math.round((Date.now() - startTime) / 1000);
    log(`\n🎉 StackSprinter completed in ${duration}s!`, LogLevel.SUCCESS);
    log('\n📊 Your app is live:', LogLevel.INFO);
    log(`   🌐 Website: ${state.vercelUrl}`, LogLevel.INFO);
    log(`   📚 GitHub: ${state.githubRepoUrl}`, LogLevel.INFO);
    log(`   🗄️  Supabase: https://supabase.com/dashboard/project/${state.supabaseProjectRef}`, LogLevel.INFO);
    
  } catch (error) {
    log(`❌ StackSprinter failed: ${error instanceof Error ? error.message : 'Unknown error'}`, LogLevel.ERROR);
    if (options.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

async function main() {
  const program = new Command();
  
  program
    .name('stacksprinter')
    .description('One-click Supabase → GitHub → Vercel launcher for Next.js apps')
    .version('1.0.0');

  program
    .command('create')
    .description('Create and deploy a new Next.js app')
    .requiredOption('--app-name <name>', 'Name of the application')
    .option('--org <org>', 'Vercel organization', 'personal')
    .option('--supabase-org <org>', 'Supabase organization', 'default')
    .option('--region <region>', 'Supabase region', 'us-east-1')
    .option('--github-org <org>', 'GitHub organization (defaults to your username)')
    .option('--visibility <type>', 'GitHub repository visibility', 'private')
    .option('-v, --verbose', 'Enable verbose logging')
    .action(async (options) => {
      if (options.verbose) {
        process.env.STACKSPRINTER_LOG_LEVEL = 'DEBUG';
      }
      
      await loadEnv();
      await validateEnv();
      await preflight();
      await stacksprint(options);
    });

  program
    .command('verify')
    .description('Verify a deployed StackSprinter app')
    .requiredOption('--app-name <name>', 'Name of the application to verify')
    .action(async (options) => {
      const projectPath = resolve(process.cwd(), options.appName);
      const state = await loadState(projectPath);
      
      if (!state?.vercelUrl) {
        log('No deployed app found. Run "stacksprinter create" first.', LogLevel.ERROR);
        process.exit(1);
      }
      
      log(`🔍 Verifying ${state.vercelUrl}...`, LogLevel.INFO);
      
      try {
        // Verify health endpoint
        const healthResponse = await fetch(`${state.vercelUrl}/api/health`);
        if (!healthResponse.ok) {
          throw new Error(`Health check failed: ${healthResponse.status}`);
        }
        
        const healthData = await healthResponse.json();
        if (!healthData.ok) {
          throw new Error('Health check returned not ok');
        }
        
        log('✅ Health check passed', LogLevel.SUCCESS);
        
        // Verify examples endpoint
        const examplesResponse = await fetch(`${state.vercelUrl}/api/examples`);
        if (!examplesResponse.ok) {
          throw new Error(`Examples endpoint failed: ${examplesResponse.status}`);
        }
        
        const examplesData = await examplesResponse.json();
        if (!Array.isArray(examplesData) || examplesData.length === 0) {
          throw new Error('Examples endpoint returned no data');
        }
        
        log('✅ Database connection verified', LogLevel.SUCCESS);
        log('🎉 All checks passed!', LogLevel.SUCCESS);
        
      } catch (error) {
        log(`❌ Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`, LogLevel.ERROR);
        process.exit(1);
      }
    });

  await program.parseAsync();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}