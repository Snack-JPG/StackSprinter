import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { log, LogLevel } from './log.js';

export interface EnvConfig {
  SUPABASE_ACCESS_TOKEN?: string;
  VERCEL_TOKEN?: string;
  GH_TOKEN?: string;
  ACTIONS_ID_TOKEN_REQUEST_TOKEN?: string;
  STACKSPRINTER_DEFAULT_REGION?: string;
  STACKSPRINTER_DEFAULT_ORG?: string;
  STACKSPRINTER_LOG_LEVEL?: string;
}

export function loadEnv(): void {
  const envPaths = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '.env.local'),
    resolve(process.env.HOME || '~', '.stacksprinter', 'config')
  ];

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      try {
        const content = readFileSync(envPath, 'utf-8');
        parseEnvContent(content);
        log(`Loaded environment from ${envPath}`, LogLevel.DEBUG);
      } catch (error) {
        log(`Failed to load ${envPath}: ${error instanceof Error ? error.message : 'Unknown error'}`, LogLevel.WARN);
      }
    }
  }
}

function parseEnvContent(content: string): void {
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    
    // Parse KEY=value pairs
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      const cleanKey = key.trim();
      let cleanValue = value.trim();
      
      // Remove quotes if present
      if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) ||
          (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
        cleanValue = cleanValue.slice(1, -1);
      }
      
      // Only set if not already in process.env (CLI args take precedence)
      if (!process.env[cleanKey]) {
        process.env[cleanKey] = cleanValue;
      }
    }
  }
}

export function validateEnv(): void {
  const required = ['SUPABASE_ACCESS_TOKEN', 'VERCEL_TOKEN', 'GH_TOKEN'];
  const missing: string[] = [];
  
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    log('Missing required environment variables:', LogLevel.ERROR);
    for (const key of missing) {
      log(`  - ${key}: ${getEnvHint(key)}`, LogLevel.ERROR);
    }
    log('\nPlease set these in your environment or create a .env file.', LogLevel.ERROR);
    log('See .env.example for reference.', LogLevel.ERROR);
    process.exit(1);
  }
  
  // Validate token formats
  validateTokenFormat('SUPABASE_ACCESS_TOKEN', process.env.SUPABASE_ACCESS_TOKEN!);
  validateTokenFormat('VERCEL_TOKEN', process.env.VERCEL_TOKEN!);
  validateTokenFormat('GH_TOKEN', process.env.GH_TOKEN!);
  
  log('✅ Environment validation passed', LogLevel.DEBUG);
}

function validateTokenFormat(name: string, token: string): void {
  let isValid = false;
  
  switch (name) {
    case 'SUPABASE_ACCESS_TOKEN':
      // Supabase access tokens start with 'sb'
      isValid = token.startsWith('sb') && token.length > 40;
      break;
    case 'VERCEL_TOKEN':
      // Vercel tokens are typically 24 chars and may start with various prefixes
      isValid = token.length >= 20;
      break;
    case 'GH_TOKEN':
      // GitHub PATs start with 'ghp_', 'gho_', 'ghu_', or 'ghs_'
      isValid = /^gh[pous]_[a-zA-Z0-9]{36}$/.test(token) || token.length >= 20;
      break;
  }
  
  if (!isValid) {
    log(`Warning: ${name} format looks invalid`, LogLevel.WARN);
  }
}

function getEnvHint(key: string): string {
  const hints: Record<string, string> = {
    SUPABASE_ACCESS_TOKEN: 'Get from https://supabase.com/dashboard/account/tokens',
    VERCEL_TOKEN: 'Get from https://vercel.com/account/tokens',
    GH_TOKEN: 'Get from https://github.com/settings/tokens (needs repo scope)'
  };
  return hints[key] || 'Set this environment variable';
}

export function getEnvConfig(): EnvConfig {
  return {
    SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN,
    VERCEL_TOKEN: process.env.VERCEL_TOKEN,
    GH_TOKEN: process.env.GH_TOKEN,
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
    STACKSPRINTER_DEFAULT_REGION: process.env.STACKSPRINTER_DEFAULT_REGION || 'us-east-1',
    STACKSPRINTER_DEFAULT_ORG: process.env.STACKSPRINTER_DEFAULT_ORG,
    STACKSPRINTER_LOG_LEVEL: process.env.STACKSPRINTER_LOG_LEVEL || 'INFO'
  };
}

export function maskSensitiveEnv(): Record<string, string> {
  const masked: Record<string, string> = {};
  const sensitive = ['TOKEN', 'KEY', 'SECRET', 'PASSWORD', 'PASS'];
  
  for (const [key, value] of Object.entries(process.env)) {
    if (!value) continue;
    
    const isSensitive = sensitive.some(pattern => key.toUpperCase().includes(pattern));
    masked[key] = isSensitive ? '***' : value;
  }
  
  return masked;
}