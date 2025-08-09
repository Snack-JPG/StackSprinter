#!/usr/bin/env tsx

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { execCommand } from '../cli/lib/exec.js';
import { log, LogLevel, redactSecrets } from '../cli/lib/log.js';

// MCP Tool interface
interface MCPTool {
  name: string;
  description: string;
  handler: (params: any) => Promise<any>;
}

// Security configuration
const SECURITY_CONFIG = {
  ALLOW_WRITE: process.env.ALLOW_WRITE === 'true',
  ALLOWED_QUERY_PATTERNS: [
    /^SELECT\s+/i,
    /^WITH\s+/i, // Allow CTEs that start with WITH
    /^EXPLAIN\s+/i, // Allow query planning
  ],
  BLOCKED_QUERY_PATTERNS: [
    /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|REPLACE)\b/i,
    /\b(EXEC|EXECUTE|sp_|xp_)\b/i, // Block stored procedures
    /\b(INFORMATION_SCHEMA\.ROUTINES|pg_proc|pg_class)\b/i, // Block system info
  ],
  MAX_QUERY_LENGTH: 1000,
  MAX_ROWS: 1000,
};

// Logging with secret redaction
function logMCP(message: string, level: LogLevel = LogLevel.INFO): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: LogLevel[level],
    message: redactSecrets(message),
    source: 'mcp'
  };
  
  console.log(JSON.stringify(logEntry));
}

// Validate SQL query for safety
function validateQuery(query: string): { valid: boolean; reason?: string } {
  if (!query || typeof query !== 'string') {
    return { valid: false, reason: 'Query must be a non-empty string' };
  }
  
  if (query.length > SECURITY_CONFIG.MAX_QUERY_LENGTH) {
    return { valid: false, reason: `Query too long (max ${SECURITY_CONFIG.MAX_QUERY_LENGTH} chars)` };
  }
  
  // Check for blocked patterns
  for (const pattern of SECURITY_CONFIG.BLOCKED_QUERY_PATTERNS) {
    if (pattern.test(query)) {
      return { valid: false, reason: 'Query contains blocked operations' };
    }
  }
  
  // Check for allowed patterns
  const hasAllowedPattern = SECURITY_CONFIG.ALLOWED_QUERY_PATTERNS.some(
    pattern => pattern.test(query.trim())
  );
  
  if (!hasAllowedPattern) {
    return { valid: false, reason: 'Query must start with allowed operation (SELECT, WITH, EXPLAIN)' };
  }
  
  return { valid: true };
}

// Check if write operations are allowed
function checkWritePermission(operation: string): { allowed: boolean; reason?: string } {
  if (!SECURITY_CONFIG.ALLOW_WRITE) {
    return { 
      allowed: false, 
      reason: `Write operation "${operation}" requires ALLOW_WRITE=true environment variable` 
    };
  }
  return { allowed: true };
}

// Tool implementations
const tools: MCPTool[] = [
  {
    name: 'db_list_tables',
    description: 'List all tables in the Supabase database',
    handler: async (params: { project_ref: string }) => {
      try {
        logMCP(`Listing tables for project ${params.project_ref}`, LogLevel.INFO);
        
        const query = `
          SELECT table_name, table_type 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name
        `;
        
        const result = await execCommand(
          `supabase db query "${query}" --project-ref ${params.project_ref} --output json`
        );
        
        const tables = JSON.parse(result);
        logMCP(`Found ${tables.length} tables`, LogLevel.INFO);
        
        return {
          success: true,
          data: tables,
          count: tables.length
        };
      } catch (error) {
        logMCP(`Failed to list tables: ${error instanceof Error ? error.message : 'Unknown error'}`, LogLevel.ERROR);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  },

  {
    name: 'db_query_safe',
    description: 'Execute a safe read-only query on the database',
    handler: async (params: { project_ref: string; query: string; limit?: number }) => {
      try {
        const { project_ref, query, limit = 100 } = params;
        
        // Validate query
        const validation = validateQuery(query);
        if (!validation.valid) {
          return {
            success: false,
            error: validation.reason
          };
        }
        
        // Enforce row limit
        const safeLimit = Math.min(limit, SECURITY_CONFIG.MAX_ROWS);
        const limitedQuery = query.includes('LIMIT') ? query : `${query} LIMIT ${safeLimit}`;
        
        logMCP(`Executing safe query on project ${project_ref}`, LogLevel.INFO);
        
        const result = await execCommand(
          `supabase db query "${limitedQuery}" --project-ref ${project_ref} --output json`
        );
        
        const data = JSON.parse(result);
        logMCP(`Query returned ${data.length} rows`, LogLevel.INFO);
        
        return {
          success: true,
          data,
          count: data.length,
          query: redactSecrets(limitedQuery)
        };
      } catch (error) {
        logMCP(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`, LogLevel.ERROR);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  },

  {
    name: 'db_run_migration',
    description: 'Run a database migration (requires ALLOW_WRITE=true)',
    handler: async (params: { project_ref: string; migration_file: string; confirm: boolean }) => {
      const writeCheck = checkWritePermission('migration');
      if (!writeCheck.allowed) {
        return {
          success: false,
          error: writeCheck.reason
        };
      }
      
      if (!params.confirm) {
        return {
          success: false,
          error: 'Migration requires explicit confirmation (confirm: true)'
        };
      }
      
      try {
        const { project_ref, migration_file } = params;
        const migrationPath = resolve(migration_file);
        
        if (!existsSync(migrationPath)) {
          return {
            success: false,
            error: `Migration file not found: ${migrationPath}`
          };
        }
        
        logMCP(`Running migration ${migration_file} on project ${project_ref}`, LogLevel.INFO);
        
        const result = await execCommand(
          `supabase db push --project-ref ${project_ref} --include-all`
        );
        
        logMCP('Migration completed successfully', LogLevel.INFO);
        
        return {
          success: true,
          message: 'Migration completed successfully',
          output: redactSecrets(result)
        };
      } catch (error) {
        logMCP(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`, LogLevel.ERROR);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  },

  {
    name: 'db_seed_demo',
    description: 'Seed the database with demo data (requires ALLOW_WRITE=true)',
    handler: async (params: { project_ref: string; confirm: boolean }) => {
      const writeCheck = checkWritePermission('seeding');
      if (!writeCheck.allowed) {
        return {
          success: false,
          error: writeCheck.reason
        };
      }
      
      if (!params.confirm) {
        return {
          success: false,
          error: 'Seeding requires explicit confirmation (confirm: true)'
        };
      }
      
      try {
        const { project_ref } = params;
        
        logMCP(`Seeding demo data for project ${project_ref}`, LogLevel.INFO);
        
        const result = await execCommand(
          `supabase db seed --project-ref ${project_ref}`
        );
        
        logMCP('Database seeding completed', LogLevel.INFO);
        
        return {
          success: true,
          message: 'Demo data seeded successfully',
          output: redactSecrets(result)
        };
      } catch (error) {
        logMCP(`Seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`, LogLevel.ERROR);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  },

  {
    name: 'vercel_env_set',
    description: 'Set environment variables on Vercel project (requires ALLOW_WRITE=true)',
    handler: async (params: { project_name: string; env_vars: Record<string, string>; environment?: string }) => {
      const writeCheck = checkWritePermission('environment variables');
      if (!writeCheck.allowed) {
        return {
          success: false,
          error: writeCheck.reason
        };
      }
      
      try {
        const { project_name, env_vars, environment = 'production' } = params;
        const results: string[] = [];
        
        logMCP(`Setting ${Object.keys(env_vars).length} environment variables for ${project_name}`, LogLevel.INFO);
        
        for (const [key, value] of Object.entries(env_vars)) {
          try {
            await execCommand(
              `vercel env add ${key} ${environment} --project ${project_name}`,
              { env: { VERCEL_ENV_VALUE: value } }
            );
            results.push(`✅ ${key}: set`);
            logMCP(`Set environment variable: ${key}`, LogLevel.DEBUG);
          } catch (error) {
            results.push(`❌ ${key}: failed`);
            logMCP(`Failed to set ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`, LogLevel.WARN);
          }
        }
        
        return {
          success: true,
          message: 'Environment variables processed',
          results
        };
      } catch (error) {
        logMCP(`Environment variable setting failed: ${error instanceof Error ? error.message : 'Unknown error'}`, LogLevel.ERROR);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  },

  {
    name: 'repo_open_pr',
    description: 'Open a pull request on the GitHub repository (requires ALLOW_WRITE=true)',
    handler: async (params: { owner: string; repo: string; title: string; body: string; head: string; base?: string }) => {
      const writeCheck = checkWritePermission('pull request');
      if (!writeCheck.allowed) {
        return {
          success: false,
          error: writeCheck.reason
        };
      }
      
      try {
        const { owner, repo, title, body, head, base = 'main' } = params;
        
        logMCP(`Opening PR: ${title} on ${owner}/${repo}`, LogLevel.INFO);
        
        const result = await execCommand(
          `gh pr create --repo ${owner}/${repo} --title "${title}" --body "${body}" --head ${head} --base ${base}`
        );
        
        // Extract PR URL from output
        const prUrl = result.match(/https:\/\/github\.com\/[^\s]+/)?.[0];
        
        logMCP(`Pull request created: ${prUrl}`, LogLevel.INFO);
        
        return {
          success: true,
          message: 'Pull request created successfully',
          url: prUrl,
          output: redactSecrets(result)
        };
      } catch (error) {
        logMCP(`PR creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, LogLevel.ERROR);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  },

  {
    name: 'get_deployment_status',
    description: 'Get the status of a StackSprinter deployment',
    handler: async (params: { app_name: string }) => {
      try {
        const { app_name } = params;
        const stateFile = resolve(process.cwd(), app_name, '.stacksprinter', 'state.json');
        
        if (!existsSync(stateFile)) {
          return {
            success: false,
            error: `No deployment found for app: ${app_name}`
          };
        }
        
        const stateContent = readFileSync(stateFile, 'utf-8');
        const state = JSON.parse(stateContent);
        
        // Redact sensitive information
        const publicState = {
          appName: state.appName,
          createdAt: state.createdAt,
          vercelUrl: state.vercelUrl,
          githubRepoUrl: state.githubRepoUrl,
          supabaseProjectRef: state.supabaseProjectRef,
          status: 'deployed'
        };
        
        logMCP(`Retrieved deployment status for ${app_name}`, LogLevel.INFO);
        
        return {
          success: true,
          data: publicState
        };
      } catch (error) {
        logMCP(`Failed to get deployment status: ${error instanceof Error ? error.message : 'Unknown error'}`, LogLevel.ERROR);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  }
];

// MCP Server implementation
async function handleToolCall(toolName: string, params: any): Promise<any> {
  const tool = tools.find(t => t.name === toolName);
  
  if (!tool) {
    return {
      success: false,
      error: `Tool not found: ${toolName}`
    };
  }
  
  try {
    const result = await tool.handler(params);
    return result;
  } catch (error) {
    logMCP(`Tool ${toolName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`, LogLevel.ERROR);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Main MCP server loop
async function main() {
  logMCP('StackSprinter MCP Server starting...', LogLevel.INFO);
  logMCP(`Write operations: ${SECURITY_CONFIG.ALLOW_WRITE ? 'ENABLED' : 'DISABLED'}`, LogLevel.INFO);
  
  // Listen for JSON-RPC requests on stdin
  process.stdin.setEncoding('utf8');
  
  process.stdin.on('readable', async () => {
    const chunk = process.stdin.read();
    if (chunk !== null) {
      try {
        const request = JSON.parse(chunk.toString().trim());
        
        if (request.method === 'tools/call') {
          const { name, arguments: params } = request.params;
          const result = await handleToolCall(name, params);
          
          const response = {
            jsonrpc: '2.0',
            id: request.id,
            result
          };
          
          process.stdout.write(JSON.stringify(response) + '\n');
        } else if (request.method === 'tools/list') {
          const response = {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              tools: tools.map(tool => ({
                name: tool.name,
                description: tool.description
              }))
            }
          };
          
          process.stdout.write(JSON.stringify(response) + '\n');
        }
      } catch (error) {
        logMCP(`Request parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`, LogLevel.ERROR);
      }
    }
  });
  
  process.stdin.on('end', () => {
    logMCP('StackSprinter MCP Server shutting down...', LogLevel.INFO);
    process.exit(0);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}