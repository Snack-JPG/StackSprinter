#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the TypeScript MCP tools file
const mcpToolsPath = path.join(__dirname, '../mcp/tools.ts');
const mcpToolsContent = fs.readFileSync(mcpToolsPath, 'utf-8');

// Simple TypeScript to CommonJS conversion
const convertedContent = `#!/usr/bin/env node

const { readFileSync, existsSync } = require('fs');
const { resolve } = require('path');
const { spawn } = require('child_process');

// Simple exec function for CommonJS
async function execCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    const { cwd = process.cwd(), env = {}, silent = false } = options;
    const [cmd, ...args] = command.split(' ');
    
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(\`Command failed with exit code \${code}: \${stderr || stdout}\`));
      } else {
        resolve(stdout.trim());
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Simple logging
const LogLevel = { DEBUG: 0, INFO: 1, SUCCESS: 2, WARN: 3, ERROR: 4 };

function log(message, level = LogLevel.INFO) {
  const timestamp = new Date().toISOString();
  const levelText = Object.keys(LogLevel)[level] || 'INFO';
  const logEntry = {
    timestamp,
    level: levelText,
    message: redactSecrets(message),
    source: 'mcp'
  };
  console.log(JSON.stringify(logEntry));
}

function redactSecrets(text) {
  return text
    .replace(/token[=:]\\s*[^\\s"']+/gi, 'token=***')
    .replace(/key[=:]\\s*[^\\s"']+/gi, 'key=***')
    .replace(/password[=:]\\s*[^\\s"']+/gi, 'password=***')
    .replace(/secret[=:]\\s*[^\\s"']+/gi, 'secret=***')
    .replace(/(sb[a-zA-Z0-9]{40,})/g, 'sb***')
    .replace(/(vercel_[a-zA-Z0-9]{24})/g, 'vercel_***')
    .replace(/(ghp_[a-zA-Z0-9]{36})/g, 'ghp_***');
}

// Security configuration
const SECURITY_CONFIG = {
  ALLOW_WRITE: process.env.ALLOW_WRITE === 'true',
  ALLOWED_QUERY_PATTERNS: [
    /^SELECT\\s+/i,
    /^WITH\\s+/i,
    /^EXPLAIN\\s+/i,
  ],
  BLOCKED_QUERY_PATTERNS: [
    /\\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|REPLACE)\\b/i,
    /\\b(EXEC|EXECUTE|sp_|xp_)\\b/i,
    /\\b(INFORMATION_SCHEMA\\.ROUTINES|pg_proc|pg_class)\\b/i,
  ],
  MAX_QUERY_LENGTH: 1000,
  MAX_ROWS: 1000,
};

function validateQuery(query) {
  if (!query || typeof query !== 'string') {
    return { valid: false, reason: 'Query must be a non-empty string' };
  }
  
  if (query.length > SECURITY_CONFIG.MAX_QUERY_LENGTH) {
    return { valid: false, reason: \`Query too long (max \${SECURITY_CONFIG.MAX_QUERY_LENGTH} chars)\` };
  }
  
  for (const pattern of SECURITY_CONFIG.BLOCKED_QUERY_PATTERNS) {
    if (pattern.test(query)) {
      return { valid: false, reason: 'Query contains blocked operations' };
    }
  }
  
  const hasAllowedPattern = SECURITY_CONFIG.ALLOWED_QUERY_PATTERNS.some(
    pattern => pattern.test(query.trim())
  );
  
  if (!hasAllowedPattern) {
    return { valid: false, reason: 'Query must start with allowed operation (SELECT, WITH, EXPLAIN)' };
  }
  
  return { valid: true };
}

function checkWritePermission(operation) {
  if (!SECURITY_CONFIG.ALLOW_WRITE) {
    return { 
      allowed: false, 
      reason: \`Write operation "\${operation}" requires ALLOW_WRITE=true environment variable\` 
    };
  }
  return { allowed: true };
}

// MCP Tools implementation
const tools = [
  {
    name: 'db_list_tables',
    description: 'List all tables in the Supabase database',
    handler: async (params) => {
      try {
        log(\`Listing tables for project \${params.project_ref}\`, LogLevel.INFO);
        
        const query = \`
          SELECT table_name, table_type 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name
        \`;
        
        const result = await execCommand(
          \`supabase db query "\${query}" --project-ref \${params.project_ref} --output json\`
        );
        
        const tables = JSON.parse(result);
        log(\`Found \${tables.length} tables\`, LogLevel.INFO);
        
        return {
          success: true,
          data: tables,
          count: tables.length
        };
      } catch (error) {
        log(\`Failed to list tables: \${error.message}\`, LogLevel.ERROR);
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'db_query_safe',
    description: 'Execute a safe read-only query on the database',
    handler: async (params) => {
      try {
        const { project_ref, query, limit = 100 } = params;
        
        const validation = validateQuery(query);
        if (!validation.valid) {
          return {
            success: false,
            error: validation.reason
          };
        }
        
        const safeLimit = Math.min(limit, SECURITY_CONFIG.MAX_ROWS);
        const limitedQuery = query.includes('LIMIT') ? query : \`\${query} LIMIT \${safeLimit}\`;
        
        log(\`Executing safe query on project \${project_ref}\`, LogLevel.INFO);
        
        const result = await execCommand(
          \`supabase db query "\${limitedQuery}" --project-ref \${project_ref} --output json\`
        );
        
        const data = JSON.parse(result);
        log(\`Query returned \${data.length} rows\`, LogLevel.INFO);
        
        return {
          success: true,
          data,
          count: data.length,
          query: redactSecrets(limitedQuery)
        };
      } catch (error) {
        log(\`Query failed: \${error.message}\`, LogLevel.ERROR);
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'get_deployment_status',
    description: 'Get the status of a StackSprinter deployment',
    handler: async (params) => {
      try {
        const { app_name } = params;
        const stateFile = resolve(process.cwd(), app_name, '.stacksprinter', 'state.json');
        
        if (!existsSync(stateFile)) {
          return {
            success: false,
            error: \`No deployment found for app: \${app_name}\`
          };
        }
        
        const stateContent = readFileSync(stateFile, 'utf-8');
        const state = JSON.parse(stateContent);
        
        const publicState = {
          appName: state.appName,
          createdAt: state.createdAt,
          vercelUrl: state.vercelUrl,
          githubRepoUrl: state.githubRepoUrl,
          supabaseProjectRef: state.supabaseProjectRef,
          status: 'deployed'
        };
        
        log(\`Retrieved deployment status for \${app_name}\`, LogLevel.INFO);
        
        return {
          success: true,
          data: publicState
        };
      } catch (error) {
        log(\`Failed to get deployment status: \${error.message}\`, LogLevel.ERROR);
        return {
          success: false,
          error: error.message
        };
      }
    }
  }
];

// MCP Server implementation  
async function handleToolCall(toolName, params) {
  const tool = tools.find(t => t.name === toolName);
  
  if (!tool) {
    return {
      success: false,
      error: \`Tool not found: \${toolName}\`
    };
  }
  
  try {
    return await tool.handler(params);
  } catch (error) {
    log(\`Tool \${toolName} failed: \${error.message}\`, LogLevel.ERROR);
    return {
      success: false,
      error: error.message
    };
  }
}

// Main MCP server loop
async function main() {
  log('StackSprinter MCP Server starting...', LogLevel.INFO);
  log(\`Write operations: \${SECURITY_CONFIG.ALLOW_WRITE ? 'ENABLED' : 'DISABLED'}\`, LogLevel.INFO);
  
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
          
          process.stdout.write(JSON.stringify(response) + '\\n');
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
          
          process.stdout.write(JSON.stringify(response) + '\\n');
        }
      } catch (error) {
        log(\`Request parsing failed: \${error.message}\`, LogLevel.ERROR);
      }
    }
  });
  
  process.stdin.on('end', () => {
    log('StackSprinter MCP Server shutting down...', LogLevel.INFO);
    process.exit(0);
  });
}

if (require.main === module) {
  main().catch(console.error);
}
`;

// Write the converted file
const outputPath = path.join(__dirname, '../mcp/tools.cjs');
fs.writeFileSync(outputPath, convertedContent);

// Make it executable
fs.chmodSync(outputPath, 0o755);

console.log('✅ Built MCP tools to CommonJS: mcp/tools.cjs');
console.log('🔧 Users can now use the MCP server without installing tsx');