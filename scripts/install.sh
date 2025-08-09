#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Default values
INSTALL_GLOBAL=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --global)
      INSTALL_GLOBAL=true
      shift
      ;;
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --help|-h)
      echo "StackSprinter Installation Script"
      echo ""
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --global    Install StackSprinter globally via npm"
      echo "  --verbose   Enable verbose output"
      echo "  --help      Show this help message"
      echo ""
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

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

check_command() {
  if command -v "$1" &> /dev/null; then
    if [[ "$VERBOSE" == "true" ]]; then
      local version=$($1 --version 2>/dev/null | head -n1 || echo "unknown")
      log_success "$1 is installed ($version)"
    else
      log_success "$1 is installed"
    fi
    return 0
  else
    log_error "$1 is not installed"
    return 1
  fi
}

install_hint() {
  local tool=$1
  local hint=$2
  echo -e "  ${YELLOW}📦 Install $tool:${NC} $hint"
}

# Print header
echo -e "${BOLD}🚀 StackSprinter Installation${NC}"
echo -e "${BOLD}===============================${NC}"
echo ""

# Check system requirements
log "Checking system requirements..."

# Check Node.js version
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version | cut -d'v' -f2)
  NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1)
  
  if [[ "$NODE_MAJOR" -ge 18 ]]; then
    log_success "Node.js $NODE_VERSION (>= 18 required)"
  else
    log_error "Node.js $NODE_VERSION is too old (>= 18 required)"
    install_hint "Node.js" "Visit https://nodejs.org/"
    exit 1
  fi
else
  log_error "Node.js is not installed"
  install_hint "Node.js" "Visit https://nodejs.org/"
  exit 1
fi

# Check for required tools
MISSING_TOOLS=()

if ! check_command "pnpm"; then
  MISSING_TOOLS+=("pnpm")
fi

if ! check_command "git"; then
  MISSING_TOOLS+=("git")
fi

if ! check_command "gh"; then
  MISSING_TOOLS+=("gh")
fi

if ! check_command "vercel"; then
  MISSING_TOOLS+=("vercel")
fi

if ! check_command "supabase"; then
  MISSING_TOOLS+=("supabase")
fi

if ! check_command "jq"; then
  MISSING_TOOLS+=("jq")
fi

# Print installation hints for missing tools
if [[ ${#MISSING_TOOLS[@]} -gt 0 ]]; then
  echo ""
  log_error "Missing required tools:"
  
  for tool in "${MISSING_TOOLS[@]}"; do
    case $tool in
      pnpm)
        install_hint "pnpm" "npm install -g pnpm"
        ;;
      git)
        install_hint "git" "Visit https://git-scm.com/"
        ;;
      gh)
        install_hint "GitHub CLI" "Visit https://cli.github.com/"
        ;;
      vercel)
        install_hint "Vercel CLI" "npm install -g vercel"
        ;;
      supabase)
        install_hint "Supabase CLI" "Visit https://supabase.com/docs/guides/cli"
        ;;
      jq)
        if [[ "$OSTYPE" == "darwin"* ]]; then
          install_hint "jq" "brew install jq"
        else
          install_hint "jq" "apt-get install jq (Ubuntu/Debian) or yum install jq (RHEL/CentOS)"
        fi
        ;;
    esac
  done
  
  echo ""
  log_error "Please install the missing tools and run this script again."
  exit 1
fi

log_success "All required tools are installed"

# Check environment variables
echo ""
log "Checking environment setup..."

ENV_FILE=".env"
if [[ -f "$ENV_FILE" ]]; then
  log_success "Found .env file"
  
  # Check for required variables
  REQUIRED_VARS=("SUPABASE_ACCESS_TOKEN" "VERCEL_TOKEN" "GH_TOKEN")
  MISSING_VARS=()
  
  for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" "$ENV_FILE" 2>/dev/null || [[ -z $(grep "^${var}=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs) ]]; then
      MISSING_VARS+=("$var")
    fi
  done
  
  if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
    log_warning "Missing or empty environment variables in .env:"
    for var in "${MISSING_VARS[@]}"; do
      echo -e "  ${YELLOW}- $var${NC}"
    done
    echo ""
    echo -e "${YELLOW}📝 Edit your .env file and add the missing tokens:${NC}"
    echo -e "  ${BLUE}- SUPABASE_ACCESS_TOKEN:${NC} https://supabase.com/dashboard/account/tokens"
    echo -e "  ${BLUE}- VERCEL_TOKEN:${NC} https://vercel.com/account/tokens"
    echo -e "  ${BLUE}- GH_TOKEN:${NC} https://github.com/settings/tokens (repo scope required)"
  else
    log_success "All required environment variables are set"
  fi
else
  log_warning "No .env file found"
  echo -e "${YELLOW}📝 Copy .env.example to .env and fill in your tokens:${NC}"
  echo -e "  ${BLUE}cp .env.example .env${NC}"
fi

# Install dependencies
echo ""
log "Installing dependencies..."

if [[ "$VERBOSE" == "true" ]]; then
  pnpm install
else
  pnpm install --silent
fi

log_success "Dependencies installed successfully"

# Global installation
if [[ "$INSTALL_GLOBAL" == "true" ]]; then
  echo ""
  log "Installing StackSprinter globally..."
  
  if [[ "$VERBOSE" == "true" ]]; then
    pnpm build && npm link
  else
    pnpm build && npm link --silent
  fi
  
  log_success "StackSprinter installed globally"
  echo -e "${GREEN}You can now run: ${BOLD}stacksprinter create --app-name my-app${NC}"
fi

# Success message
echo ""
echo -e "${GREEN}${BOLD}🎉 StackSprinter installation completed!${NC}"
echo ""
echo -e "${BOLD}Next steps:${NC}"

if [[ "$INSTALL_GLOBAL" != "true" ]]; then
  echo -e "1. ${BLUE}Install globally (optional):${NC} $0 --global"
fi

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
  echo -e "2. ${BLUE}Configure environment:${NC} Edit .env with your tokens"
  echo -e "3. ${BLUE}Create your first app:${NC} pnpm dlx tsx cli/stacksprinter.ts create --app-name my-app"
else
  echo -e "2. ${BLUE}Create your first app:${NC} pnpm dlx tsx cli/stacksprinter.ts create --app-name my-app"
fi

echo ""
echo -e "${BLUE}For help and documentation:${NC}"
echo -e "  ${BLUE}• Help:${NC} stacksprinter --help"
echo -e "  ${BLUE}• GitHub:${NC} https://github.com/stacksprinter/stacksprinter"
echo ""