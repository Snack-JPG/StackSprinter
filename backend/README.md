# ArbitrageMarkets Backend

Real-time arbitrage detection platform between Kalshi and Polymarket prediction markets.

## Architecture Overview

The backend is built with TypeScript, Express, and Socket.io, providing both REST API endpoints and real-time WebSocket updates for arbitrage opportunities.

### Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **WebSocket**: Socket.io
- **Database**: PostgreSQL (with Prisma ORM)
- **Cache**: Redis (via ioredis)
- **Language**: TypeScript (strict mode)
- **Validation**: Zod
- **Logging**: Winston
- **API Clients**: Axios with Bottleneck rate limiting

## Project Structure

```
backend/
├── src/
│   ├── index.ts                    # Entry point, Express + Socket.io server
│   ├── config/
│   │   └── env.ts                  # Environment validation with Zod
│   ├── clients/
│   │   ├── types.ts                # Shared types for markets and arbitrage
│   │   ├── kalshi.ts               # Kalshi API client (fully implemented)
│   │   └── polymarket.ts           # Polymarket API client (placeholder)
│   ├── services/
│   │   ├── cache.ts                # Redis caching service
│   │   ├── market-fetcher.ts       # Polls APIs for market data
│   │   └── arbitrage-detector.ts   # Detects arbitrage opportunities
│   ├── routes/
│   │   └── api.ts                  # REST API endpoints
│   └── utils/
│       └── logger.ts               # Winston logger
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

**Required Environment Variables:**

```env
# Kalshi Credentials
KALSHI_EMAIL=your-email@example.com
KALSHI_PASSWORD=your-password

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=arbitrage_markets
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-postgres-password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`.

## API Endpoints

### Health & Status

- `GET /health` - Health check
- `GET /api/status` - API status and service health

### Markets

- `GET /api/markets` - Get all markets
  - Query params: `platform`, `status`, `limit`
- `GET /api/markets/:platform/:id` - Get specific market

### Arbitrage Opportunities

- `GET /api/arbitrage` - Get current arbitrage opportunities
  - Query params: `minProfit`, `limit`
- `GET /api/arbitrage/:id` - Get specific opportunity

### Market Pairs

- `GET /api/matched-pairs` - Get matched market pairs
  - Query params: `minScore`, `limit`

### Statistics

- `GET /api/stats` - Get platform statistics

## WebSocket Events

### Client → Server

- `subscribe:arbitrage` - Subscribe to arbitrage updates
- `subscribe:markets` - Subscribe to market updates
  - Payload: `{ platform?: 'kalshi' | 'polymarket' }`
- `unsubscribe` - Unsubscribe from channel
  - Payload: `{ channel: string }`

### Server → Client

- `welcome` - Connection confirmation
- `subscribed` - Subscription confirmation
- `unsubscribed` - Unsubscribe confirmation
- `new_opportunities` - New arbitrage opportunities detected
- `market_update` - Market data updated

## Kalshi API Client

The Kalshi client is fully implemented with:

- ✅ **Authentication** - Email/password login with automatic token refresh
- ✅ **Rate Limiting** - Bottleneck-based rate limiting (configurable)
- ✅ **Auto-retry** - Automatic retry on 401 errors
- ✅ **Market Fetching** - Get all markets, single market, by ticker
- ✅ **Error Handling** - Comprehensive error handling with logging
- ✅ **TypeScript Types** - Full type safety for all API responses

### Example Usage

```typescript
import { createKalshiClient } from './clients/kalshi';

const client = createKalshiClient({
  baseUrl: 'https://api.elections.kalshi.com/trade-api/v2',
  email: 'your-email@example.com',
  password: 'your-password',
  rateLimit: 10, // requests per second
});

// Authenticate (automatic on first request)
await client.authenticate();

// Fetch all open markets
const markets = await client.getMarkets({ status: 'open' });

// Get specific market
const market = await client.getMarket('PRES-2024-DEM');
```

## Services

### Market Fetcher Service

Polls Kalshi and Polymarket APIs at configurable intervals, caching results in Redis.

**Features:**
- Periodic polling (default: 30 seconds)
- Redis caching
- Parallel fetching from both platforms
- Error recovery

**TODO:**
- WebSocket streaming for real-time updates

### Arbitrage Detector Service

Analyzes market pairs to identify arbitrage opportunities.

**Current Implementation:**
- Simple title-based market matching (Jaccard similarity)
- Profit calculation for YES and NO positions
- Risk scoring based on volume, time to close, price volatility
- Liquidity scoring

**TODO:**
- Advanced market matching (fuzzy matching, NLP, embeddings)
- WebSocket notifications
- Historical tracking
- Manual market pair curation

### Cache Service

Redis-based caching with TTL support.

**Features:**
- Market data caching (60s TTL)
- Opportunity caching (30s TTL)
- Pattern-based cache invalidation
- Health checking

## Development

### Scripts

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm start            # Start production server
npm run typecheck    # Type checking only
npm run lint         # Lint code
npm run format       # Format code with Prettier
```

### TypeScript Configuration

The project uses strict TypeScript with:
- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- Path aliases for clean imports

## TODO: Polymarket Integration

The Polymarket client is currently a placeholder. To implement:

1. Research Polymarket API documentation
2. Implement authentication (if required)
3. Implement market fetching endpoints
4. Map Polymarket data to unified `Market` interface
5. Add rate limiting
6. Update `market-fetcher.ts` to use the client

## TODO: Database Integration

PostgreSQL with Prisma is configured in `package.json` but not yet implemented.

**Planned Schema:**
- `markets` - Store historical market data
- `opportunities` - Track arbitrage opportunities
- `matched_pairs` - Manual market pair curation
- `executions` - Track executed arbitrage trades (future)

## TODO: Production Deployment

Before deploying to production:

1. Set up PostgreSQL database
2. Run Prisma migrations
3. Set up Redis instance
4. Configure environment variables
5. Set up process manager (PM2)
6. Configure reverse proxy (Nginx)
7. Set up logging aggregation
8. Add monitoring (Prometheus, Grafana)
9. Implement API authentication
10. Add rate limiting middleware

## Error Handling

The application includes comprehensive error handling:

- Global error middleware in Express
- Service-level error logging
- Redis connection retry logic
- API client retry logic
- Graceful shutdown handling

## Logging

Winston-based logging with:
- Console output (development)
- File output (production)
- Structured JSON logs
- Log levels: error, warn, info, http, debug
- HTTP request logging

## Rate Limiting

API clients use Bottleneck for rate limiting:
- Configurable requests per second
- Request queuing
- Automatic backoff
- Reservoir refill

## Contributing

1. Follow the existing code structure
2. Use TypeScript strict mode
3. Add comprehensive error handling
4. Include logging for debugging
5. Write type definitions for all APIs
6. Update this README for major changes

## License

MIT
