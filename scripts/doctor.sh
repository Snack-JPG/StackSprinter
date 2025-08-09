#!/bin/bash

# StackSprinter Doctor - Health check for your development environment
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Counters
PASSED=0
WARNINGS=0
ERRORS=0

log_pass() {
  echo -e "${GREEN}✅ $1${NC}"
  ((PASSED++))
}

log_warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
  ((WARNINGS++))
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
  ((ERRORS++))
}

log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

check_version() {
  local cmd=$1
  local min_version=$2
  local version_flag=${3:-"--version"}
  
  if command -v "$cmd" &> /dev/null; then
    local current_version
    current_version=$($cmd $version_flag 2>/dev/null | head -n1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -n1)
    
    if [[ -n "$current_version" ]]; then
      log_pass "$cmd v$current_version"
      return 0
    else
      log_warn "$cmd installed but version unknown"
      return 1
    fi
  else
    log_error "$cmd not installed"
    return 1
  fi
}

check_auth() {
  local service=$1
  local check_cmd=$2
  
  if eval "$check_cmd" &>/dev/null; then
    log_pass "$service authentication"
  else
    log_error "$service not authenticated"
  fi
}

# Print header
echo -e "${BOLD}🩺 StackSprinter Doctor${NC}"
echo -e "${BOLD}=====================${NC}"
echo ""

# System requirements
echo -e "${BOLD}📋 System Requirements${NC}"

# Node.js version check
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version | cut -d'v' -f2)
  NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1)
  
  if [[ "$NODE_MAJOR" -ge 18 ]]; then
    log_pass "Node.js v$NODE_VERSION (>= 18 required)"
  else
    log_error "Node.js v$NODE_VERSION is too old (>= 18 required)"
  fi
else
  log_error "Node.js not installed"
fi

# Package managers
check_version "npm" "6.0.0"
check_version "pnpm" "6.0.0"

echo ""

# CLI tools
echo -e "${BOLD}🛠️  CLI Tools${NC}"

check_version "git" "2.0.0"
check_version "gh" "2.0.0"
check_version "vercel" "24.0.0"
check_version "supabase" "1.0.0"
check_version "jq" "1.6.0"

echo ""

# Authentication status
echo -e "${BOLD}🔐 Authentication Status${NC}"

check_auth "GitHub CLI" "gh auth status"
check_auth "Vercel CLI" "vercel whoami"
check_auth "Supabase CLI" "supabase projects list"

echo ""

# Environment variables
echo -e "${BOLD}🌍 Environment Variables${NC}"

# Check for .env file
if [[ -f ".env" ]]; then
  log_pass ".env file exists"
  
  # Check for required variables
  required_vars=("SUPABASE_ACCESS_TOKEN" "VERCEL_TOKEN" "GH_TOKEN")
  
  for var in "${required_vars[@]}"; do
    if grep -q "^${var}=" .env 2>/dev/null && [[ -n $(grep "^${var}=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs) ]]; then
      log_pass "$var configured"
    else
      log_error "$var missing or empty in .env"
    fi
  done
else
  log_error ".env file not found"
  log_info "Copy .env.example to .env and add your tokens"
fi

echo ""

# Project structure
echo -e "${BOLD}📂 Project Structure${NC}"

critical_files=(
  "cli/stacksprinter.ts"
  "mcp/tools.ts"
  "supabase/migrations/0001_init.sql"
  "scripts/install.sh"
  "scripts/verify.sh"
)

for file in "${critical_files[@]}"; do
  if [[ -f "$file" ]]; then
    log_pass "$file"
  else
    log_error "$file missing"
  fi
done

echo ""

# Network connectivity
echo -e "${BOLD}🌐 Network Connectivity${NC}"

services=(
  "github.com:443"
  "api.vercel.com:443"
  "api.supabase.com:443"
  "registry.npmjs.org:443"
)

for service in "${services[@]}"; do
  host=$(echo "$service" | cut -d':' -f1)
  port=$(echo "$service" | cut -d':' -f2)
  
  if timeout 5 bash -c ">/dev/tcp/$host/$port" 2>/dev/null; then
    log_pass "$host:$port reachable"
  else
    log_warn "$host:$port unreachable (may be firewall/proxy)"
  fi
done

echo ""

# Performance check
echo -e "${BOLD}⚡ Performance Check${NC}"

# Check available disk space
if command -v df &> /dev/null; then
  available_space=$(df . | tail -n1 | awk '{print $4}')
  # Convert to MB (assuming 1KB blocks)
  available_mb=$((available_space / 1024))
  
  if [[ $available_mb -gt 1000 ]]; then
    log_pass "Disk space: ${available_mb}MB available"
  elif [[ $available_mb -gt 500 ]]; then
    log_warn "Disk space: ${available_mb}MB available (getting low)"
  else
    log_error "Disk space: ${available_mb}MB available (critically low)"
  fi
fi

# Check internet speed (basic)
echo -n "🌐 Testing connection speed... "
if timeout 10 curl -s -w "%{time_total}" -o /dev/null https://api.github.com > /tmp/speed_test 2>/dev/null; then
  speed=$(cat /tmp/speed_test)
  rm -f /tmp/speed_test
  
  if (( $(echo "$speed < 2.0" | bc -l) )); then
    echo -e "${GREEN}✅ Fast connection (${speed}s)${NC}"
    ((PASSED++))
  elif (( $(echo "$speed < 5.0" | bc -l) )); then
    echo -e "${YELLOW}⚠️  Slow connection (${speed}s)${NC}"
    ((WARNINGS++))
  else
    echo -e "${RED}❌ Very slow connection (${speed}s)${NC}"
    ((ERRORS++))
  fi
else
  echo -e "${RED}❌ Connection test failed${NC}"
  ((ERRORS++))
fi

echo ""

# Quick functionality test
echo -e "${BOLD}🧪 Quick Functionality Test${NC}"

# Test TypeScript compilation
if [[ -f "cli/stacksprinter.ts" ]]; then
  echo -n "📝 TypeScript check... "
  if pnpm exec tsc --noEmit > /dev/null 2>&1; then
    log_pass "TypeScript compilation successful"
  else
    log_warn "TypeScript compilation has issues"
  fi
fi

echo ""

# Summary
echo -e "${BOLD}📊 Summary${NC}"
echo -e "✅ Passed: ${GREEN}$PASSED${NC}"
echo -e "⚠️  Warnings: ${YELLOW}$WARNINGS${NC}"
echo -e "❌ Errors: ${RED}$ERRORS${NC}"

echo ""

if [[ $ERRORS -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}🎉 Your environment is ready for StackSprinter!${NC}"
  echo ""
  echo -e "${BLUE}Quick start:${NC}"
  echo -e "  ${BLUE}pnpm dlx tsx cli/stacksprinter.ts create --app-name \"my-app\"${NC}"
elif [[ $ERRORS -le 3 && $WARNINGS -le 5 ]]; then
  echo -e "${YELLOW}${BOLD}⚠️  Your environment has some issues but might work${NC}"
  echo ""
  echo -e "${BLUE}Recommended actions:${NC}"
  if [[ $ERRORS -gt 0 ]]; then
    echo -e "  • Fix the ${RED}${ERRORS} error(s)${NC} above"
  fi
  if [[ $WARNINGS -gt 0 ]]; then
    echo -e "  • Address the ${YELLOW}${WARNINGS} warning(s)${NC} if possible"
  fi
else
  echo -e "${RED}${BOLD}❌ Your environment needs significant fixes before using StackSprinter${NC}"
  echo ""
  echo -e "${BLUE}Next steps:${NC}"
  echo -e "  1. Run ${BLUE}./scripts/install.sh --verbose${NC} to fix tool issues"
  echo -e "  2. Set up authentication: ${BLUE}gh auth login${NC}, ${BLUE}vercel login${NC}"
  echo -e "  3. Create and populate your ${BLUE}.env${NC} file"
  echo -e "  4. Run ${BLUE}./scripts/doctor.sh${NC} again"
fi

echo ""

# Exit with appropriate code
if [[ $ERRORS -eq 0 ]]; then
  exit 0
elif [[ $ERRORS -le 3 ]]; then
  exit 1
else
  exit 2
fi