#!/bin/bash

# StackSprinter Local Development Setup
# This script sets up local development conveniences after installation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log() {
  echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# Print header
echo -e "${BOLD}🛠️  StackSprinter Local Development Setup${NC}"
echo -e "${BOLD}=========================================${NC}"
echo ""

# Create local development directory
DEV_DIR="$HOME/.stacksprinter"
if [[ ! -d "$DEV_DIR" ]]; then
  mkdir -p "$DEV_DIR"
  log_success "Created development directory: $DEV_DIR"
fi

# Copy example config if it doesn't exist
if [[ ! -f "$DEV_DIR/config" ]]; then
  if [[ -f ".env.example" ]]; then
    cp .env.example "$DEV_DIR/config"
    log_success "Created config template: $DEV_DIR/config"
    log_info "Edit $DEV_DIR/config with your API tokens"
  fi
fi

# Create shell aliases for development
SHELL_RC=""
if [[ "$SHELL" == */zsh ]]; then
  SHELL_RC="$HOME/.zshrc"
elif [[ "$SHELL" == */bash ]]; then
  SHELL_RC="$HOME/.bashrc"
fi

if [[ -n "$SHELL_RC" ]]; then
  ALIAS_LINE="alias stacksprinter-dev='tsx $PWD/cli/stacksprinter.ts'"
  
  if ! grep -q "stacksprinter-dev" "$SHELL_RC" 2>/dev/null; then
    echo "" >> "$SHELL_RC"
    echo "# StackSprinter Development Alias" >> "$SHELL_RC"
    echo "$ALIAS_LINE" >> "$SHELL_RC"
    log_success "Added development alias to $SHELL_RC"
    log_info "Run 'source $SHELL_RC' or restart your terminal"
  else
    log_info "Development alias already exists in $SHELL_RC"
  fi
fi

# Create VS Code workspace settings
VSCODE_DIR=".vscode"
if [[ ! -d "$VSCODE_DIR" ]]; then
  mkdir -p "$VSCODE_DIR"
fi

# VS Code settings for TypeScript and formatting
cat > "$VSCODE_DIR/settings.json" << 'EOF'
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/dist": true,
    "**/.stacksprinter": true,
    "**/test-*": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/dist": true
  }
}
EOF

log_success "Created VS Code workspace settings"

# VS Code recommended extensions
cat > "$VSCODE_DIR/extensions.json" << 'EOF'
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "github.copilot",
    "github.copilot-chat"
  ]
}
EOF

log_success "Created VS Code extension recommendations"

# Create development scripts
DEV_SCRIPTS_DIR="scripts/dev"
if [[ ! -d "$DEV_SCRIPTS_DIR" ]]; then
  mkdir -p "$DEV_SCRIPTS_DIR"
fi

# Quick test script
cat > "$DEV_SCRIPTS_DIR/quick-test.sh" << 'EOF'
#!/bin/bash
set -e

APP_NAME="dev-test-$(date +%s)"
echo "🧪 Testing with app name: $APP_NAME"

# Create test app
tsx cli/stacksprinter.ts create \
  --app-name "$APP_NAME" \
  --verbose

# Verify it works
./scripts/verify.sh --app-name "$APP_NAME"

# Clean up (optional - comment out to inspect results)
echo "🧹 Cleaning up test app: $APP_NAME"
rm -rf "$APP_NAME"

echo "✅ Quick test completed successfully!"
EOF

chmod +x "$DEV_SCRIPTS_DIR/quick-test.sh"
log_success "Created quick test script: $DEV_SCRIPTS_DIR/quick-test.sh"

# MCP development script
cat > "$DEV_SCRIPTS_DIR/mcp-test.sh" << 'EOF'
#!/bin/bash
set -e

echo "🤖 Testing MCP server..."

# Start MCP server in background
tsx mcp/tools.ts &
MCP_PID=$!

# Give it time to start
sleep 2

# Test list tools
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | nc localhost 3000 || echo "Direct connection failed, trying stdin..."

# Test with stdin (actual MCP protocol)
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | tsx mcp/tools.ts

# Clean up
kill $MCP_PID 2>/dev/null || true

echo "✅ MCP test completed!"
EOF

chmod +x "$DEV_SCRIPTS_DIR/mcp-test.sh"
log_success "Created MCP test script: $DEV_SCRIPTS_DIR/mcp-test.sh"

# Git hooks for development
GIT_HOOKS_DIR=".git/hooks"
if [[ -d ".git" && -d "$GIT_HOOKS_DIR" ]]; then
  # Pre-commit hook to run type checking
  cat > "$GIT_HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash
set -e

echo "🔍 Running pre-commit checks..."

# Type checking
echo "📝 Type checking..."
pnpm run typecheck

# Check for common issues
echo "🔍 Checking for potential secrets..."
if grep -r -E "(sk_|supabase_|vercel_)" --include="*.ts" --include="*.js" . --exclude-dir=node_modules --exclude-dir=.git; then
  echo "❌ Potential secrets found in code!"
  exit 1
fi

echo "✅ Pre-commit checks passed!"
EOF

  chmod +x "$GIT_HOOKS_DIR/pre-commit"
  log_success "Created git pre-commit hook"
fi

# Create development environment check script
cat > "$DEV_SCRIPTS_DIR/check-env.sh" << 'EOF'
#!/bin/bash

echo "🔍 StackSprinter Development Environment Check"
echo "============================================="
echo ""

# Check Node.js
echo "📦 Node.js: $(node --version 2>/dev/null || echo '❌ Not installed')"

# Check pnpm
echo "📦 pnpm: $(pnpm --version 2>/dev/null || echo '❌ Not installed')"

# Check CLI tools
tools=("git" "gh" "vercel" "supabase" "jq")
for tool in "${tools[@]}"; do
  if command -v "$tool" &> /dev/null; then
    version=$($tool --version 2>/dev/null | head -n1 | cut -d' ' -f3 || "unknown")
    echo "🛠️  $tool: $version"
  else
    echo "🛠️  $tool: ❌ Not installed"
  fi
done

echo ""

# Check environment variables
echo "🔐 Environment Variables:"
required_vars=("SUPABASE_ACCESS_TOKEN" "VERCEL_TOKEN" "GH_TOKEN")
for var in "${required_vars[@]}"; do
  if [[ -n "${!var}" ]]; then
    echo "✅ $var: configured"
  else
    echo "❌ $var: missing"
  fi
done

echo ""

# Check project structure
echo "📂 Project Structure:"
important_files=("cli/stacksprinter.ts" "mcp/tools.ts" "supabase/migrations/0001_init.sql")
for file in "${important_files[@]}"; do
  if [[ -f "$file" ]]; then
    echo "✅ $file"
  else
    echo "❌ $file: missing"
  fi
done

echo ""
echo "🎯 Development ready! Use 'scripts/dev/quick-test.sh' to test functionality."
EOF

chmod +x "$DEV_SCRIPTS_DIR/check-env.sh"
log_success "Created environment check script: $DEV_SCRIPTS_DIR/check-env.sh"

# Final summary
echo ""
echo -e "${GREEN}${BOLD}🎉 Local development setup completed!${NC}"
echo ""
echo -e "${BOLD}What was created:${NC}"
echo -e "  📂 Development directory: ${BLUE}$DEV_DIR${NC}"
echo -e "  ⚙️  VS Code settings: ${BLUE}.vscode/{settings,extensions}.json${NC}"
echo -e "  🛠️  Development scripts: ${BLUE}scripts/dev/${NC}"
echo -e "  🪝 Git hooks: ${BLUE}.git/hooks/pre-commit${NC}"

if [[ -n "$SHELL_RC" ]]; then
  echo -e "  🔧 Shell alias: ${BLUE}stacksprinter-dev${NC}"
fi

echo ""
echo -e "${BOLD}Quick commands:${NC}"
echo -e "  🧪 ${BLUE}scripts/dev/quick-test.sh${NC} - Test full functionality"
echo -e "  🔍 ${BLUE}scripts/dev/check-env.sh${NC} - Check development environment"
echo -e "  🤖 ${BLUE}scripts/dev/mcp-test.sh${NC} - Test MCP server"

if [[ -n "$SHELL_RC" ]]; then
  echo ""
  echo -e "${YELLOW}Don't forget to reload your shell:${NC}"
  echo -e "  ${BLUE}source $SHELL_RC${NC}"
fi

echo ""