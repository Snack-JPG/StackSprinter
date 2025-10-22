#!/bin/bash

###############################################################################
# ArbitrageMarkets - Database Setup Script
#
# This script automates the complete database infrastructure setup:
# 1. Starts Docker containers (PostgreSQL + Redis)
# 2. Waits for health checks to pass
# 3. Runs Prisma migrations
# 4. Optionally seeds sample data
#
# Usage:
#   ./scripts/setup-db.sh              # Basic setup
#   ./scripts/setup-db.sh --seed       # Setup with sample data
#   ./scripts/setup-db.sh --reset      # Reset and recreate everything
#   ./scripts/setup-db.sh --help       # Show help
#
# Requirements:
#   - Docker and Docker Compose installed
#   - Node.js 18+ installed
#   - pnpm or npm installed
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
MAX_WAIT_TIME=60  # Maximum time to wait for services (seconds)

# Parse command line arguments
SEED_DATA=false
RESET_DB=false
SHOW_HELP=false

for arg in "$@"; do
  case $arg in
    --seed)
      SEED_DATA=true
      shift
      ;;
    --reset)
      RESET_DB=true
      shift
      ;;
    --help)
      SHOW_HELP=true
      shift
      ;;
    *)
      ;;
  esac
done

###############################################################################
# Functions
###############################################################################

print_header() {
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

show_help() {
  cat << EOF
ArbitrageMarkets Database Setup Script

USAGE:
    ./scripts/setup-db.sh [OPTIONS]

OPTIONS:
    --seed      Seed database with sample data after setup
    --reset     Stop containers, remove volumes, and start fresh
    --help      Show this help message

EXAMPLES:
    # Basic setup
    ./scripts/setup-db.sh

    # Setup with sample data
    ./scripts/setup-db.sh --seed

    # Complete reset and fresh setup
    ./scripts/setup-db.sh --reset --seed

REQUIREMENTS:
    - Docker and Docker Compose
    - Node.js 18+
    - pnpm or npm

For more information, see README.md
EOF
}

check_requirements() {
  print_header "Checking Requirements"

  # Check Docker
  if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    echo "Install Docker from: https://docs.docker.com/get-docker/"
    exit 1
  fi
  print_success "Docker is installed"

  # Check Docker Compose
  if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed"
    exit 1
  fi
  print_success "Docker Compose is installed"

  # Check Node.js
  if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
  fi
  print_success "Node.js is installed ($(node -v))"

  # Check package manager
  if command -v pnpm &> /dev/null; then
    PKG_MANAGER="pnpm"
  elif command -v npm &> /dev/null; then
    PKG_MANAGER="npm"
  else
    print_error "No package manager found (pnpm or npm required)"
    exit 1
  fi
  print_success "Package manager: $PKG_MANAGER"

  echo ""
}

start_docker_containers() {
  print_header "Starting Docker Containers"

  cd "$PROJECT_ROOT"

  if [ "$RESET_DB" = true ]; then
    print_warning "Stopping existing containers and removing volumes..."
    docker-compose down -v 2>/dev/null || true
    print_success "Containers stopped and volumes removed"
  fi

  print_info "Starting PostgreSQL and Redis containers..."
  docker-compose up -d

  print_success "Docker containers started"
  echo ""
}

wait_for_postgres() {
  print_header "Waiting for PostgreSQL"

  local elapsed=0
  local interval=2

  while [ $elapsed -lt $MAX_WAIT_TIME ]; do
    if docker-compose exec -T postgres pg_isready -U postgres -d arbitrage_markets &> /dev/null; then
      print_success "PostgreSQL is ready"
      echo ""
      return 0
    fi

    echo -ne "\rWaiting for PostgreSQL... ${elapsed}s / ${MAX_WAIT_TIME}s"
    sleep $interval
    elapsed=$((elapsed + interval))
  done

  print_error "PostgreSQL failed to start within ${MAX_WAIT_TIME}s"
  exit 1
}

wait_for_redis() {
  print_header "Waiting for Redis"

  local elapsed=0
  local interval=2

  while [ $elapsed -lt $MAX_WAIT_TIME ]; do
    if docker-compose exec -T redis redis-cli ping &> /dev/null; then
      print_success "Redis is ready"
      echo ""
      return 0
    fi

    echo -ne "\rWaiting for Redis... ${elapsed}s / ${MAX_WAIT_TIME}s"
    sleep $interval
    elapsed=$((elapsed + interval))
  done

  print_error "Redis failed to start within ${MAX_WAIT_TIME}s"
  exit 1
}

install_dependencies() {
  print_header "Installing Backend Dependencies"

  cd "$BACKEND_DIR"

  if [ ! -f "package.json" ]; then
    print_error "package.json not found in $BACKEND_DIR"
    exit 1
  fi

  print_info "Running $PKG_MANAGER install..."
  $PKG_MANAGER install

  print_success "Dependencies installed"
  echo ""
}

run_migrations() {
  print_header "Running Database Migrations"

  cd "$BACKEND_DIR"

  # Set environment variable for database URL
  export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/arbitrage_markets"

  print_info "Generating Prisma Client..."
  $PKG_MANAGER exec prisma generate

  print_info "Running migrations..."
  $PKG_MANAGER exec prisma db push

  print_success "Migrations completed"
  echo ""
}

seed_database() {
  print_header "Seeding Database"

  cd "$BACKEND_DIR"

  if [ ! -f "prisma/seed.ts" ]; then
    print_warning "No seed file found at prisma/seed.ts"
    print_info "Skipping seeding..."
    echo ""
    return 0
  fi

  print_info "Running seed script..."
  $PKG_MANAGER run db:seed || print_warning "Seed script not configured or failed"

  print_success "Database seeded"
  echo ""
}

show_connection_info() {
  print_header "Connection Information"

  cat << EOF
${GREEN}PostgreSQL${NC}
  Host:     localhost
  Port:     5432
  Database: arbitrage_markets
  User:     postgres
  Password: postgres
  URL:      postgresql://postgres:postgres@localhost:5432/arbitrage_markets

${GREEN}Redis${NC}
  Host:     localhost
  Port:     6379
  URL:      redis://localhost:6379

${GREEN}Docker Commands${NC}
  View logs:           docker-compose logs -f
  Stop containers:     docker-compose down
  Restart containers:  docker-compose restart
  View status:         docker-compose ps

${GREEN}Database Commands${NC}
  Prisma Studio:       cd backend && $PKG_MANAGER run db:studio
  Create migration:    cd backend && $PKG_MANAGER run db:migrate
  Generate client:     cd backend && $PKG_MANAGER run db:generate
  Connect to DB:       docker-compose exec postgres psql -U postgres -d arbitrage_markets
  Connect to Redis:    docker-compose exec redis redis-cli

${GREEN}Backend Commands${NC}
  Start dev server:    cd backend && $PKG_MANAGER run dev
  Build:               cd backend && $PKG_MANAGER run build
  Run tests:           cd backend && $PKG_MANAGER test

EOF
}

show_summary() {
  print_header "Setup Complete!"

  print_success "Docker containers are running"
  print_success "PostgreSQL database is ready"
  print_success "Redis cache is ready"
  print_success "Prisma migrations applied"

  if [ "$SEED_DATA" = true ]; then
    print_success "Sample data seeded"
  fi

  echo ""
  print_info "Next steps:"
  echo "  1. Start the backend: cd backend && $PKG_MANAGER run dev"
  echo "  2. Open Prisma Studio: cd backend && $PKG_MANAGER run db:studio"
  echo "  3. View the README for API documentation"
  echo ""
}

###############################################################################
# Main execution
###############################################################################

main() {
  if [ "$SHOW_HELP" = true ]; then
    show_help
    exit 0
  fi

  echo ""
  print_header "ArbitrageMarkets Database Setup"
  echo ""

  check_requirements
  start_docker_containers
  wait_for_postgres
  wait_for_redis
  install_dependencies
  run_migrations

  if [ "$SEED_DATA" = true ]; then
    seed_database
  fi

  show_connection_info
  show_summary
}

# Run main function
main
