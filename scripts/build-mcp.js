#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the TypeScript MCP tools file
const mcpToolsPath = path.join(__dirname, '../mcp/tools.ts');
const mcpToolsContent = fs.readFileSync(mcpToolsPath, 'utf-8');

// Convert TypeScript to JavaScript
const convertedContent = mcpToolsContent
  // Remove TypeScript imports and convert to require
  .replace(/import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"];/g, 'const { $1 } = require("$2");')
  .replace(/import\s+([^{][^'"`]+)\s+from\s+['"]([^'"]+)['"];/g, 'const $1 = require("$2");')
  
  // Remove TypeScript types
  .replace(/:\s*[A-Za-z<>[\]|&{}\s,]+(?=\s*[=;{)])/g, '')
  .replace(/interface\s+\w+\s*{[^}]*}/gs, '')
  .replace(/type\s+\w+\s*=[^;]+;/g, '')
  
  // Convert async function syntax
  .replace(/async\s+function\s+(\w+)\s*\([^)]*\)\s*:\s*Promise<[^>]+>/g, 'async function $1')
  
  // Remove export/import meta check
  .replace(/if \(import\.meta\.url === `file:\/\/\$\{process\.argv\[1\]\}`\) \{[^}]*\}/s, 
    'if (require.main === module) { main().catch(console.error); }')
  
  // Convert relative imports to absolute
  .replace(/require\("\.\.\/cli\/lib\/([^"]+)"\)/g, 'require("../cli/lib/$1")')
  
  // Add shebang
  .replace(/^/, '#!/usr/bin/env node\n\n');

// Write the converted file
const outputPath = path.join(__dirname, '../mcp/tools.cjs');
fs.writeFileSync(outputPath, convertedContent);

// Make it executable
fs.chmodSync(outputPath, 0o755);

console.log('✅ Built MCP tools to CommonJS: mcp/tools.cjs');
console.log('🔧 Users can now use the MCP server without installing tsx');