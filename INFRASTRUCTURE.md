# Infrastructure Setup - ArbitrageMarkets

Complete guide to setting up and managing the Docker infrastructure for ArbitrageMarkets.

## Table of Contents

- [Quick Start](#quick-start)
- [Infrastructure Components](#infrastructure-components)
- [Database Schema](#database-schema)
- [Available Commands](#available-commands)
- [Data Access Layer](#data-access-layer)
- [Cache Service](#cache-service)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ installed
- pnpm or npm installed

### Initial Setup

```bash
# 1. Clone and navigate to project
cd StackSprinter

# 2. Copy environment file
cp .env.example .env
# Edit .env with your API keys

# 3. Start Docker containers (PostgreSQL + Redis)
docker-compose up -d

# 4. Setup database and run migrations
./scripts/setup-db.sh

# 5. Optional: Setup with sample data
./scripts/setup-db.sh --seed

# 6. Start the backend
cd backend && pnpm install && pnpm run dev
```

The infrastructure is now running! Backend available at `http://localhost:3001`

---

## Infrastructure Components

### PostgreSQL 15

**Purpose**: Primary database for storing market data, matched pairs, opportunities, and user information.

**Configuration**:
- **Port**: 5432
- **Database**: `arbitrage_markets`
- **User**: `postgres`
- **Password**: `postgres` (change in production!)
- **Volume**: `arbitrage_postgres_data` (persists data across restarts)

**Features**:
- Automatic health checks
- UTF-8 encoding
- Auto-restart on failure
- Data persistence via named volumes

**Connection String**:
```bash
postgresql://postgres:postgres@localhost:5432/arbitrage_markets
```

### Redis 7

**Purpose**: High-speed cache for market data and opportunities to reduce API calls and improve response times.

**Configuration**:
- **Port**: 6379
- **Max Memory**: 256MB
- **Eviction Policy**: `allkeys-lru` (removes least recently used keys)
- **Persistence**: Enabled (saves to disk every 60 seconds if 1+ key changed)
- **Volume**: `arbitrage_redis_data`

**Features**:
- Automatic health checks
- Memory limit with LRU eviction
- Optional data persistence
- Auto-restart on failure

**Connection String**:
```bash
redis://localhost:6379
```

### Prisma ORM

**Purpose**: Type-safe database access with automatic migrations and schema management.

**Features**:
- Auto-generated TypeScript types
- Connection pooling
- Query builder
- Migration management
- Database introspection

**Schema Location**: `/backend/prisma/schema.prisma`

---

## Database Schema

The database includes five main tables optimized for performance with strategic indexes:

### 1. Markets

Stores all market data from Kalshi and Polymarket.

**Fields**:
- `id` - Internal unique identifier (CUID)
- `platform` - 'kalshi' or 'polymarket'
- `marketId` - Platform's native market ID
- `title` - Market question/title
- `description` - Detailed description
- `yesPrice` - Current YES price (0-1)
- `noPrice` - Current NO price (0-1)
- `volume` - Total trading volume
- `closeDate` - When market closes
- `resolutionCriteria` - How market will be resolved
- `lastUpdated` - Last price update timestamp
- `createdAt` - Record creation timestamp

**Indexes**:
- Unique constraint on (platform, marketId)
- Index on platform
- Index on closeDate
- Index on lastUpdated
- Index on title (for search)

### 2. MatchedPairs

Links markets between Kalshi and Polymarket that represent the same event.

**Fields**:
- `id` - Unique identifier
- `kalshiMarketId` - Reference to Kalshi market
- `polymarketMarketId` - Reference to Polymarket market
- `confidence` - Match confidence score (0-1)
- `status` - 'active', 'inactive', or 'archived'
- `createdAt` - When match was created
- `updatedAt` - Last update timestamp

**Indexes**:
- Unique constraint on (kalshiMarketId, polymarketMarketId)
- Index on status
- Index on confidence
- Index on createdAt

### 3. Opportunities

Records detected arbitrage opportunities.

**Fields**:
- `id` - Unique identifier
- `matchedPairId` - Reference to matched pair
- `kalshiPrice` - Kalshi price at detection
- `polymarketPrice` - Polymarket price at detection
- `spread` - Price difference (absolute)
- `netProfit` - Expected profit after fees (%)
- `riskScore` - Risk assessment (0-1)
- `detectedAt` - Detection timestamp

**Indexes**:
- Index on matchedPairId
- Index on netProfit (for finding profitable opportunities)
- Index on riskScore (for filtering by risk)
- Index on detectedAt (for time-based queries)
- Index on spread

### 4. Users

User accounts for authentication and personalization (future feature).

**Fields**:
- `id` - Unique identifier
- `email` - User email (unique)
- `emailVerified` - Email verification status
- `createdAt` - Account creation timestamp
- `updatedAt` - Last update timestamp

**Indexes**:
- Unique constraint on email
- Index on email

### 5. Alerts

User-configured notification preferences.

**Fields**:
- `id` - Unique identifier
- `userId` - Reference to user
- `minProfit` - Minimum profit % to trigger alert
- `categories` - Market categories to monitor
- `enabled` - Alert enabled/disabled
- `createdAt` - Alert creation timestamp
- `updatedAt` - Last update timestamp

**Indexes**:
- Index on userId
- Index on enabled
- Index on minProfit

---

## Available Commands

### Docker Management

```bash
# Start all containers
docker-compose up -d

# Stop all containers
docker-compose down

# Stop and remove volumes (reset data)
docker-compose down -v

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f postgres
docker-compose logs -f redis

# Check container status
docker-compose ps

# Restart containers
docker-compose restart

# Rebuild containers
docker-compose up -d --build
```

### Database Operations

```bash
# Navigate to backend
cd backend

# Run database migrations
pnpm run db:migrate

# Push schema changes without migration
pnpm run db:push

# Generate Prisma Client (after schema changes)
pnpm run db:generate

# Open Prisma Studio (database GUI)
pnpm run db:studio

# Seed database with sample data
pnpm run db:seed

# Deploy migrations to production
pnpm run db:migrate:deploy
```

### Direct Database Access

```bash
# Connect to PostgreSQL CLI
docker-compose exec postgres psql -U postgres -d arbitrage_markets

# Example queries
docker-compose exec postgres psql -U postgres -d arbitrage_markets -c "SELECT COUNT(*) FROM \"Market\";"
docker-compose exec postgres psql -U postgres -d arbitrage_markets -c "SELECT * FROM \"Opportunity\" ORDER BY \"netProfit\" DESC LIMIT 10;"

# Connect to Redis CLI
docker-compose exec redis redis-cli

# Redis commands
docker-compose exec redis redis-cli ping
docker-compose exec redis redis-cli INFO memory
docker-compose exec redis redis-cli KEYS "*"
docker-compose exec redis redis-cli FLUSHDB  # Clear all cache
```

### Backend Development

```bash
cd backend

# Install dependencies
pnpm install

# Start development server (hot reload)
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm run start

# Type checking
pnpm run typecheck

# Linting
pnpm run lint

# Format code
pnpm run format
```

### Setup Script Options

```bash
# Basic setup
./scripts/setup-db.sh

# Setup with sample data
./scripts/setup-db.sh --seed

# Complete reset and fresh setup
./scripts/setup-db.sh --reset

# Setup with seed data after reset
./scripts/setup-db.sh --reset --seed

# Show help
./scripts/setup-db.sh --help
```

---

## Data Access Layer

Type-safe repositories with automatic connection pooling and error handling.

### Markets Repository

**Location**: `/backend/src/db/repositories/markets.repository.ts`

```typescript
import { marketsRepository } from './db/repositories/markets.repository';

// Create or update market
await marketsRepository.upsertMarket({
  platform: 'kalshi',
  marketId: 'KXBTC-23DEC-B45000',
  title: 'Will Bitcoin reach $45,000 by Dec 23?',
  yesPrice: 0.45,
  noPrice: 0.55,
  volume: 150000,
  closeDate: new Date('2023-12-23'),
});

// Get markets by platform
const kalshiMarkets = await marketsRepository.getMarketsByPlatform('kalshi', 50);

// Search markets
const results = await marketsRepository.searchMarkets('Bitcoin', 20);

// Get stale markets (need price updates)
const staleMarkets = await marketsRepository.getStaleMarkets(5); // 5 minutes old

// Bulk upsert
await marketsRepository.upsertMarkets(marketsArray);
```

### Matched Pairs Repository

**Location**: `/backend/src/db/repositories/matched-pairs.repository.ts`

```typescript
import { matchedPairsRepository } from './db/repositories/matched-pairs.repository';

// Create matched pair
await matchedPairsRepository.upsertMatchedPair({
  kalshiMarketId: 'market-1-id',
  polymarketMarketId: 'market-2-id',
  confidence: 0.92,
  status: 'active',
});

// Get high confidence matches
const matches = await matchedPairsRepository.getHighConfidenceMatches(0.8, 50);

// Get matches with recent opportunities
const activeMatches = await matchedPairsRepository.getMatchesWithOpportunities(24, 50);

// Get matched pair with full market details
const pair = await matchedPairsRepository.getMatchedPairById('pair-id');
```

### Opportunities Repository

**Location**: `/backend/src/db/repositories/opportunities.repository.ts`

```typescript
import { opportunitiesRepository } from './db/repositories/opportunities.repository';

// Create opportunity
await opportunitiesRepository.createOpportunity({
  matchedPairId: 'pair-id',
  kalshiPrice: 0.45,
  polymarketPrice: 0.52,
  spread: 0.07,
  netProfit: 5.2,
  riskScore: 0.15,
});

// Get profitable opportunities
const profitable = await opportunitiesRepository.getProfitableOpportunities(
  2.0,  // min profit %
  1,    // hours ago
  50    // limit
);

// Get low-risk opportunities
const lowRisk = await opportunitiesRepository.getLowRiskOpportunities(
  2.0,   // min profit %
  0.3,   // max risk score
  24,    // hours ago
  20     // limit
);

// Get statistics
const stats = await opportunitiesRepository.getOpportunityStats(24);
// Returns: { total, avgProfit, avgRisk, avgSpread, maxProfit }

// Get trending opportunities
const trending = await opportunitiesRepository.getTrendingOpportunities(24, 3, 20);
```

---

## Cache Service

Redis-powered caching with automatic TTL management and error handling.

**Location**: `/backend/src/services/cache.ts`

### Basic Usage

```typescript
import { cacheService } from './services/cache';

// Cache market data (60s default TTL)
await cacheService.cacheMarkets('kalshi', marketsArray);
await cacheService.cacheMarkets('polymarket', marketsArray, 90); // custom TTL

// Retrieve cached markets
const cachedMarkets = await cacheService.getMarkets('kalshi');
if (!cachedMarkets) {
  // Cache miss - fetch from database or API
}

// Cache single opportunity (30s default TTL)
await cacheService.cacheOpportunity(opportunity);

// Cache multiple opportunities
await cacheService.cacheOpportunities(opportunitiesArray);

// Get cached opportunity
const opportunity = await cacheService.getOpportunity('opp-id');

// Cache matched pairs (120s default TTL)
await cacheService.cacheMatchedPairs(pairsArray);
const pairs = await cacheService.getMatchedPairs();

// Cache statistics (300s default TTL)
await cacheService.cacheStats('daily-stats', statsObject);
const stats = await cacheService.getStats('daily-stats');
```

### Cache Management

```typescript
// Clear specific caches
await cacheService.clearMarketCache();
await cacheService.clearOpportunityCache();

// Clear by pattern
await cacheService.clearCache('markets:*');
await cacheService.clearCache('opportunity:*');

// Clear all cache (use with caution!)
await cacheService.clearAllCache();

// Health check
const isHealthy = await cacheService.isHealthy();

// Get cache statistics
const stats = await cacheService.getCacheStats();
// Returns: { totalKeys, memoryUsed, isConnected }
```

### Default TTLs

- **Markets**: 60 seconds
- **Opportunities**: 30 seconds
- **Matched Pairs**: 120 seconds
- **Statistics**: 300 seconds

### Error Handling

The cache service is designed to be non-blocking. If Redis is unavailable:
- Cache operations fail silently with error logging
- Your application continues to work (fetches from database)
- No exceptions thrown

---

## Production Deployment

### Environment Variables

Update these settings in production:

```bash
# Production Database (Railway example)
DATABASE_URL="postgresql://postgres:strongpassword@containers-us-west-xxx.railway.app:5432/railway?sslmode=require"

# Production Redis (Railway example)
REDIS_HOST=containers-us-west-xxx.railway.app
REDIS_PORT=6379
REDIS_PASSWORD=strongpassword

# Connection Pooling
DB_POOL_MIN=5
DB_POOL_MAX=20

# Security
NODE_ENV=production
JWT_SECRET=your_secure_jwt_secret_at_least_32_characters
ENCRYPTION_KEY=your_64_character_hex_encryption_key_for_aes256
```

### Production Checklist

- [ ] Use strong, unique passwords
- [ ] Enable SSL for database connections (`?sslmode=require`)
- [ ] Increase connection pool sizes based on load
- [ ] Set up automated database backups
- [ ] Configure Redis maxmemory based on your needs
- [ ] Enable monitoring (Sentry, DataDog, etc.)
- [ ] Set up log aggregation
- [ ] Configure rate limiting
- [ ] Enable CORS with specific origins
- [ ] Set up health check endpoints
- [ ] Configure proper firewall rules
- [ ] Use environment variables (never hardcode secrets)

### Database Migrations

```bash
# Generate migration from schema changes
pnpm run db:migrate

# Deploy migrations to production
pnpm run db:migrate:deploy

# IMPORTANT: Always test migrations on staging first!
```

### Scaling Considerations

**Database**:
- Use read replicas for heavy read workloads
- Implement query result caching
- Optimize slow queries (use Prisma query logs)
- Add database indexes for common queries

**Redis**:
- Increase memory allocation for production
- Use Redis Cluster for high availability
- Consider Redis Sentinel for automatic failover
- Monitor memory usage and eviction rates

**Application**:
- Run multiple backend instances behind load balancer
- Use horizontal scaling (more containers)
- Implement connection pooling properly
- Monitor application metrics

---

## Troubleshooting

### Containers Won't Start

**Problem**: Docker containers fail to start

**Solutions**:

```bash
# Check if ports are already in use
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# Kill processes using those ports
kill -9 <PID>

# Check Docker status
docker ps -a
docker-compose ps

# View detailed logs
docker-compose logs postgres
docker-compose logs redis

# Complete reset
docker-compose down -v
docker-compose up -d

# Or use the setup script
./scripts/setup-db.sh --reset
```

### Database Connection Errors

**Problem**: Backend can't connect to PostgreSQL

**Solutions**:

```bash
# Verify containers are running
docker-compose ps

# Check PostgreSQL health
docker-compose exec postgres pg_isready -U postgres -d arbitrage_markets

# Test connection from host
psql "postgresql://postgres:postgres@localhost:5432/arbitrage_markets" -c "SELECT 1"

# Check DATABASE_URL in .env
cat backend/.env | grep DATABASE_URL

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Redis Connection Errors

**Problem**: Backend can't connect to Redis

**Solutions**:

```bash
# Check Redis health
docker-compose exec redis redis-cli ping

# Check Redis logs
docker-compose logs redis

# Test connection
redis-cli -h localhost -p 6379 ping

# Restart Redis
docker-compose restart redis

# Check if Redis is full (maxmemory reached)
docker-compose exec redis redis-cli INFO memory
```

### Prisma Issues

**Problem**: Prisma Client errors or outdated schema

**Solutions**:

```bash
cd backend

# Regenerate Prisma Client
pnpm run db:generate

# Push schema changes
pnpm run db:push

# Reset database (CAUTION: deletes all data)
pnpm run db:push --force-reset

# Check Prisma version
pnpm exec prisma --version

# Format schema file
pnpm exec prisma format
```

### Migration Errors

**Problem**: Migration fails or database out of sync

**Solutions**:

```bash
cd backend

# Check migration status
pnpm exec prisma migrate status

# Resolve failed migration
pnpm exec prisma migrate resolve --applied <migration_name>

# Create a new migration
pnpm exec prisma migrate dev --name fix_issue

# For development: reset and recreate
pnpm exec prisma migrate reset
```

### Performance Issues

**Problem**: Slow queries or high resource usage

**Solutions**:

```bash
# Check PostgreSQL resource usage
docker stats arbitrage-postgres

# Check Redis memory
docker-compose exec redis redis-cli INFO memory

# View slow queries (add to postgresql.conf)
# log_min_duration_statement = 1000  # Log queries > 1 second

# Check database size
docker-compose exec postgres psql -U postgres -d arbitrage_markets -c "SELECT pg_size_pretty(pg_database_size('arbitrage_markets'));"

# Check table sizes
docker-compose exec postgres psql -U postgres -d arbitrage_markets -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Analyze query performance in Prisma
# Enable query logging in backend/src/db/client.ts
```

### Data Loss Prevention

**Problem**: Accidental data deletion or corruption

**Prevention**:

```bash
# Regular backups
docker-compose exec postgres pg_dump -U postgres arbitrage_markets > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
cat backup_20250122_143000.sql | docker-compose exec -T postgres psql -U postgres arbitrage_markets

# Export Redis data
docker-compose exec redis redis-cli --rdb /data/dump.rdb

# Automated backup script (add to crontab)
# 0 2 * * * /path/to/backup-script.sh
```

### Common Errors

**"relation does not exist"**
```bash
# Schema not applied - run migrations
cd backend && pnpm run db:push
```

**"Redis connection refused"**
```bash
# Redis not running
docker-compose up -d redis
```

**"password authentication failed"**
```bash
# Check credentials in .env match docker-compose.yml
# Or reset containers:
docker-compose down -v && docker-compose up -d
```

**"port is already allocated"**
```bash
# Another service using the port
# Find and kill the process, or change port in docker-compose.yml
```

---

## Health Checks

Monitor your infrastructure health:

### PostgreSQL

```bash
# Check if ready
docker-compose exec postgres pg_isready -U postgres -d arbitrage_markets

# Check connections
docker-compose exec postgres psql -U postgres -d arbitrage_markets -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
docker-compose exec postgres psql -U postgres -d arbitrage_markets -c "SELECT pg_size_pretty(pg_database_size('arbitrage_markets'));"
```

### Redis

```bash
# Ping test
docker-compose exec redis redis-cli ping

# Memory info
docker-compose exec redis redis-cli INFO memory

# Check connected clients
docker-compose exec redis redis-cli CLIENT LIST

# Get key count
docker-compose exec redis redis-cli DBSIZE
```

### Backend API

```bash
# Health endpoint (add to your Express app)
curl http://localhost:3001/health

# Example response:
# {
#   "status": "healthy",
#   "timestamp": "2025-01-22T14:30:00Z",
#   "services": {
#     "database": "connected",
#     "redis": "connected"
#   }
# }
```

---

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [ArbitrageMarkets API Documentation](ARCHITECTURE.md)

---

**Need help?** Open an issue on GitHub or check the troubleshooting section above.
