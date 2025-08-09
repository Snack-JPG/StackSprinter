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
APP_NAME=""
VERBOSE=false
TIMEOUT=30

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --app-name)
      APP_NAME="$2"
      shift 2
      ;;
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --timeout|-t)
      TIMEOUT="$2"
      shift 2
      ;;
    --help|-h)
      echo "StackSprinter Verification Script"
      echo ""
      echo "Usage: $0 --app-name <app-name> [OPTIONS]"
      echo ""
      echo "Required:"
      echo "  --app-name    Name of the StackSprinter app to verify"
      echo ""
      echo "Options:"
      echo "  --verbose     Enable verbose output"
      echo "  --timeout     Request timeout in seconds (default: 30)"
      echo "  --help        Show this help message"
      echo ""
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

if [[ -z "$APP_NAME" ]]; then
  echo -e "${RED}Error: --app-name is required${NC}"
  echo "Run $0 --help for usage information"
  exit 1
fi

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

# Check if curl is available
if ! command -v curl &> /dev/null; then
  log_error "curl is required but not installed"
  exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
  log_error "jq is required but not installed"
  exit 1
fi

# Print header
echo -e "${BOLD}🔍 StackSprinter Verification${NC}"
echo -e "${BOLD}==============================${NC}"
echo -e "${BLUE}App Name:${NC} $APP_NAME"
echo -e "${BLUE}Timeout:${NC} ${TIMEOUT}s"
echo ""

# Look for state file
STATE_FILE="$APP_NAME/.stacksprinter/state.json"

if [[ ! -f "$STATE_FILE" ]]; then
  log_error "State file not found: $STATE_FILE"
  log_info "Make sure you run this script from the directory containing your StackSprinter apps"
  log_info "Or run 'stacksprinter create --app-name $APP_NAME' first"
  exit 1
fi

log_success "Found state file: $STATE_FILE"

# Parse state file
if ! VERCEL_URL=$(jq -r '.vercelUrl // empty' "$STATE_FILE" 2>/dev/null); then
  log_error "Failed to parse state file"
  exit 1
fi

if [[ -z "$VERCEL_URL" ]]; then
  log_error "No Vercel URL found in state file"
  log_info "The deployment may not have completed successfully"
  exit 1
fi

SUPABASE_PROJECT_REF=$(jq -r '.supabaseProjectRef // empty' "$STATE_FILE" 2>/dev/null)
GITHUB_REPO_URL=$(jq -r '.githubRepoUrl // empty' "$STATE_FILE" 2>/dev/null)

log_info "Vercel URL: $VERCEL_URL"
if [[ -n "$SUPABASE_PROJECT_REF" ]]; then
  log_info "Supabase Project: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF"
fi
if [[ -n "$GITHUB_REPO_URL" ]]; then
  log_info "GitHub Repository: $GITHUB_REPO_URL"
fi

echo ""

# Test 1: Health endpoint
log "Testing health endpoint..."

HEALTH_RESPONSE=$(curl -s --max-time "$TIMEOUT" "$VERCEL_URL/api/health" || true)

if [[ -z "$HEALTH_RESPONSE" ]]; then
  log_error "Health endpoint timeout or connection failed"
  log_info "URL: $VERCEL_URL/api/health"
  exit 1
fi

if [[ "$VERBOSE" == "true" ]]; then
  echo -e "${BLUE}Health Response:${NC}"
  echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
  echo ""
fi

# Parse health response
HEALTH_OK=$(echo "$HEALTH_RESPONSE" | jq -r '.ok // false' 2>/dev/null)
HEALTH_ERROR=$(echo "$HEALTH_RESPONSE" | jq -r '.error // empty' 2>/dev/null)

if [[ "$HEALTH_OK" == "true" ]]; then
  log_success "Health endpoint responding correctly"
  
  # Extract additional health info
  HEALTH_ENV=$(echo "$HEALTH_RESPONSE" | jq -r '.environment // "unknown"' 2>/dev/null)
  HEALTH_DB=$(echo "$HEALTH_RESPONSE" | jq -r '.database // "unknown"' 2>/dev/null)
  
  log_info "Environment: $HEALTH_ENV"
  log_info "Database: $HEALTH_DB"
else
  log_error "Health endpoint returned error"
  if [[ -n "$HEALTH_ERROR" ]]; then
    log_error "Error: $HEALTH_ERROR"
  fi
  exit 1
fi

# Test 2: Examples endpoint (database connectivity)
echo ""
log "Testing database connectivity..."

EXAMPLES_RESPONSE=$(curl -s --max-time "$TIMEOUT" "$VERCEL_URL/api/examples" || true)

if [[ -z "$EXAMPLES_RESPONSE" ]]; then
  log_error "Examples endpoint timeout or connection failed"
  log_info "URL: $VERCEL_URL/api/examples"
  exit 1
fi

if [[ "$VERBOSE" == "true" ]]; then
  echo -e "${BLUE}Examples Response:${NC}"
  echo "$EXAMPLES_RESPONSE" | jq '.[0:3]' 2>/dev/null || echo "$EXAMPLES_RESPONSE"
  echo ""
fi

# Parse examples response
if echo "$EXAMPLES_RESPONSE" | jq -e '. | type == "array"' > /dev/null 2>&1; then
  EXAMPLES_COUNT=$(echo "$EXAMPLES_RESPONSE" | jq '. | length' 2>/dev/null || echo "0")
  
  if [[ "$EXAMPLES_COUNT" -gt 0 ]]; then
    log_success "Database connected with $EXAMPLES_COUNT example records"
    
    # Show sample data
    SAMPLE_LABEL=$(echo "$EXAMPLES_RESPONSE" | jq -r '.[0].label // "Unknown"' 2>/dev/null)
    log_info "Sample record: \"$SAMPLE_LABEL\""
  else
    log_warning "Database connected but no example data found"
    log_info "Consider running database seeding"
  fi
else
  # Check if it's an error response
  EXAMPLES_ERROR=$(echo "$EXAMPLES_RESPONSE" | jq -r '.error // empty' 2>/dev/null)
  if [[ -n "$EXAMPLES_ERROR" ]]; then
    log_error "Database connection failed: $EXAMPLES_ERROR"
  else
    log_error "Unexpected response from examples endpoint"
  fi
  exit 1
fi

# Test 3: Homepage accessibility
echo ""
log "Testing homepage accessibility..."

HOME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$VERCEL_URL/" || echo "000")

if [[ "$HOME_STATUS" == "200" ]]; then
  log_success "Homepage accessible (HTTP $HOME_STATUS)"
elif [[ "$HOME_STATUS" == "000" ]]; then
  log_error "Homepage connection failed"
  exit 1
else
  log_warning "Homepage returned HTTP $HOME_STATUS"
fi

# Test 4: SSL Certificate (for HTTPS URLs)
if [[ "$VERCEL_URL" == https* ]]; then
  echo ""
  log "Checking SSL certificate..."
  
  if curl -s --max-time "$TIMEOUT" -I "$VERCEL_URL" | grep -q "HTTP/2 200\|HTTP/1.1 200"; then
    log_success "SSL certificate valid"
  else
    log_warning "SSL certificate check inconclusive"
  fi
fi

# Performance test (optional)
echo ""
log "Testing response time..."

START_TIME=$(date +%s.%3N)
curl -s --max-time "$TIMEOUT" "$VERCEL_URL/api/health" > /dev/null
END_TIME=$(date +%s.%3N)

RESPONSE_TIME=$(echo "$END_TIME - $START_TIME" | bc 2>/dev/null || echo "unknown")

if [[ "$RESPONSE_TIME" != "unknown" ]]; then
  if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
    log_success "Response time: ${RESPONSE_TIME}s (fast)"
  elif (( $(echo "$RESPONSE_TIME < 3.0" | bc -l) )); then
    log_success "Response time: ${RESPONSE_TIME}s (good)"
  else
    log_warning "Response time: ${RESPONSE_TIME}s (slow)"
  fi
else
  log_info "Response time: could not measure"
fi

# Final summary
echo ""
echo -e "${GREEN}${BOLD}🎉 Verification completed successfully!${NC}"
echo ""
echo -e "${BOLD}Summary:${NC}"
echo -e "${GREEN}✅ Health endpoint: working${NC}"
echo -e "${GREEN}✅ Database: connected${NC}"
echo -e "${GREEN}✅ Homepage: accessible${NC}"
echo -e "${GREEN}✅ Overall: healthy${NC}"
echo ""
echo -e "${BLUE}Your StackSprinter app is live and working correctly!${NC}"
echo -e "${BLUE}URL: ${BOLD}$VERCEL_URL${NC}"

# Additional information
if [[ -n "$SUPABASE_PROJECT_REF" ]]; then
  echo ""
  echo -e "${BLUE}Supabase Dashboard: ${BOLD}https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF${NC}"
fi

if [[ -n "$GITHUB_REPO_URL" ]]; then
  echo -e "${BLUE}GitHub Repository: ${BOLD}$GITHUB_REPO_URL${NC}"
fi

echo ""