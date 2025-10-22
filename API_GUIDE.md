# 📡 API Integration Guide

This guide covers how to obtain and use API credentials for Kalshi and Polymarket, including best practices for rate limiting, error handling, and WebSocket integration.

## Table of Contents

- [Kalshi API](#kalshi-api)
- [Polymarket API](#polymarket-api)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [WebSocket Integration](#websocket-integration)
- [Best Practices](#best-practices)

---

## Kalshi API

### Getting API Credentials

1. **Create Account**
   - Visit [kalshi.com](https://kalshi.com)
   - Complete registration (US residents only)
   - Verify identity (required for trading)

2. **Generate API Keys**
   - Log in to your Kalshi account
   - Navigate to Settings → API Access
   - Click "Create New API Key"
   - Save your API Key and Secret immediately (secret shown once)
   - **Important**: Keep credentials secure, never commit to git

3. **API Documentation**
   - Official docs: [docs.kalshi.com](https://docs.kalshi.com)
   - API base URL: `https://api.elections.kalshi.com/trade-api/v2`
   - Demo environment: `https://demo-api.kalshi.co/trade-api/v2`

### Authentication

Kalshi uses API key-based authentication with request signing:

```typescript
import crypto from 'crypto';

interface KalshiAuth {
  apiKey: string;
  apiSecret: string;
}

function signRequest(
  method: string,
  path: string,
  body: string | null,
  credentials: KalshiAuth
): string {
  const timestamp = Date.now().toString();
  const message = timestamp + method + path + (body || '');

  const signature = crypto
    .createHmac('sha256', credentials.apiSecret)
    .update(message)
    .digest('hex');

  return signature;
}

// Example request
async function getKalshiMarkets(credentials: KalshiAuth) {
  const path = '/markets';
  const method = 'GET';
  const timestamp = Date.now().toString();
  const signature = signRequest(method, path, null, credentials);

  const response = await fetch(`https://api.elections.kalshi.com/trade-api/v2${path}`, {
    headers: {
      'KALSHI-ACCESS-KEY': credentials.apiKey,
      'KALSHI-ACCESS-SIGNATURE': signature,
      'KALSHI-ACCESS-TIMESTAMP': timestamp,
      'Content-Type': 'application/json'
    }
  });

  return response.json();
}
```

### Key Endpoints

#### Get Markets
```typescript
GET /markets
Query Parameters:
  - limit: number (max 100, default 20)
  - cursor: string (pagination)
  - event_ticker: string (filter by event)
  - status: 'active' | 'closed' | 'settled'
  - min_close_ts: number (Unix timestamp)
  - max_close_ts: number (Unix timestamp)

Response:
{
  markets: [
    {
      ticker: string,           // e.g., "PRESIDENT-2024"
      event_ticker: string,     // Parent event
      title: string,
      yes_bid: number,          // Best bid for YES (0-1)
      yes_ask: number,          // Best ask for YES (0-1)
      no_bid: number,
      no_ask: number,
      last_price: number,
      volume: number,
      open_interest: number,
      close_time: number,       // Unix timestamp
      expiration_time: number,
      status: string,
      result: string | null
    }
  ],
  cursor: string | null
}
```

#### Get Market Details
```typescript
GET /markets/:ticker

Response:
{
  market: {
    ticker: string,
    title: string,
    subtitle: string,
    description: string,
    rules: string,              // Resolution criteria
    yes_bid: number,
    yes_ask: number,
    volume_24h: number,
    liquidity: number,
    // ... additional fields
  }
}
```

#### Get Order Book
```typescript
GET /markets/:ticker/orderbook
Query Parameters:
  - depth: number (default 10)

Response:
{
  orderbook: {
    yes: [
      { price: number, quantity: number },
      // ...
    ],
    no: [
      { price: number, quantity: number },
      // ...
    ]
  }
}
```

### Rate Limits

- **Read operations**: 10 requests/second per API key
- **Write operations**: 5 requests/second per API key
- **Burst allowance**: Up to 20 requests
- **Headers returned**:
  - `X-RateLimit-Limit`: Maximum requests per window
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

### Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad Request | Check request parameters |
| 401 | Unauthorized | Verify API credentials |
| 403 | Forbidden | Check account permissions |
| 404 | Not Found | Verify ticker/endpoint |
| 429 | Rate Limited | Implement exponential backoff |
| 500 | Server Error | Retry with backoff |
| 503 | Service Unavailable | Wait and retry |

---

## Polymarket API

### Getting Started

Polymarket's market data API is **publicly accessible** and requires no authentication for read operations.

- **API Base URL**: `https://gamma-api.polymarket.com`
- **Clob API**: `https://clob.polymarket.com` (trading operations)
- **Documentation**: [docs.polymarket.com](https://docs.polymarket.com)

### Key Endpoints

#### Get Markets
```typescript
GET /markets
Query Parameters:
  - limit: number (max 100, default 20)
  - offset: number
  - active: boolean
  - closed: boolean
  - archived: boolean

Response:
[
  {
    id: string,                  // Market ID
    question: string,            // Market title
    description: string,
    end_date_iso: string,        // ISO 8601 format
    game_start_time: string,
    outcomes: string[],          // Usually ["Yes", "No"]
    outcome_prices: string[],    // Current prices (0-1)
    volume: string,
    liquidity: string,
    active: boolean,
    closed: boolean,
    archived: boolean,
    market_slug: string,
    category: string,
    // ... additional fields
  }
]
```

#### Get Market by ID
```typescript
GET /markets/:id

Response:
{
  id: string,
  question: string,
  description: string,
  outcomes: string[],
  outcome_prices: string[],
  volume: string,
  liquidity: string,
  clob_token_ids: string[],     // Token IDs for trading
  tokens: [
    {
      token_id: string,
      outcome: string,
      price: string
    }
  ],
  // ... additional fields
}
```

#### Get Order Book
```typescript
GET /book
Query Parameters:
  - token_id: string (required)

Response:
{
  bids: [
    { price: string, size: string },
    // ...
  ],
  asks: [
    { price: string, size: string },
    // ...
  ],
  timestamp: number
}
```

#### Get Events
```typescript
GET /events
Query Parameters:
  - limit: number
  - offset: number
  - category: string

Response:
[
  {
    id: string,
    slug: string,
    title: string,
    description: string,
    markets: [...],              // Array of market objects
    // ...
  }
]
```

### Rate Limits

- **Public endpoints**: ~100 requests/minute (soft limit)
- **No official headers**: Monitor for 429 responses
- **Recommended**: 1 request/second for sustained polling
- **Best practice**: Use pagination, cache aggressively

### Error Handling

```typescript
async function fetchPolymarketData(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return await response.json();
      }

      if (response.status === 429) {
        // Rate limited - exponential backoff
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }

      if (response.status >= 500) {
        // Server error - retry
        await sleep(1000 * (i + 1));
        continue;
      }

      // Client error - don't retry
      throw new Error(`Polymarket API error: ${response.status}`);

    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(1000 * (i + 1));
    }
  }
}
```

---

## Rate Limiting

### Implementation Strategy

```typescript
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequest = 0;
  private minInterval: number;

  constructor(requestsPerSecond: number) {
    this.minInterval = 1000 / requestsPerSecond;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequest;

      if (timeSinceLastRequest < this.minInterval) {
        await sleep(this.minInterval - timeSinceLastRequest);
      }

      const task = this.queue.shift();
      this.lastRequest = Date.now();

      if (task) await task();
    }

    this.processing = false;
  }
}

// Usage
const kalshiLimiter = new RateLimiter(5);  // 5 requests/second
const polyLimiter = new RateLimiter(1);     // 1 request/second

const kalshiData = await kalshiLimiter.execute(() =>
  fetchKalshiMarkets()
);
```

---

## WebSocket Integration

### Kalshi WebSocket

```typescript
import WebSocket from 'ws';

class KalshiWebSocket {
  private ws: WebSocket;
  private subscriptions = new Set<string>();

  constructor(credentials: KalshiAuth) {
    this.ws = new WebSocket('wss://api.elections.kalshi.com/trade-api/ws/v2');

    this.ws.on('open', () => {
      this.authenticate(credentials);
    });

    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      this.handleMessage(message);
    });
  }

  private authenticate(credentials: KalshiAuth) {
    this.ws.send(JSON.stringify({
      type: 'authenticate',
      key: credentials.apiKey,
      signature: this.generateSignature(credentials)
    }));
  }

  subscribe(tickers: string[]) {
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      channels: tickers.map(t => `market.${t}`)
    }));

    tickers.forEach(t => this.subscriptions.add(t));
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case 'market_update':
        // Handle market price update
        break;
      case 'trade':
        // Handle trade execution
        break;
      case 'orderbook':
        // Handle order book update
        break;
    }
  }
}
```

### Polymarket WebSocket

Polymarket uses Server-Sent Events (SSE) for real-time updates:

```typescript
class PolymarketSSE {
  private eventSource: EventSource;

  constructor(tokenIds: string[]) {
    const url = `https://gamma-api.polymarket.com/prices?` +
                tokenIds.map(id => `token_id=${id}`).join('&');

    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handlePriceUpdate(data);
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      this.reconnect();
    };
  }

  private handlePriceUpdate(data: any) {
    // Process price update
    console.log('Price update:', data);
  }

  private reconnect() {
    this.eventSource.close();
    setTimeout(() => {
      this.eventSource = new EventSource(this.eventSource.url);
    }, 5000);
  }

  close() {
    this.eventSource.close();
  }
}
```

---

## Error Handling

### Retry Strategy with Exponential Backoff

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  }
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx except 429)
      if (error.response?.status >= 400 &&
          error.response?.status < 500 &&
          error.response?.status !== 429) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        options.initialDelay * Math.pow(options.backoffFactor, attempt),
        options.maxDelay
      );

      console.log(`Retry attempt ${attempt + 1}/${options.maxRetries} after ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError;
}

// Usage
const markets = await withRetry(() => fetchKalshiMarkets(credentials));
```

---

## Best Practices

### 1. Credential Management

```typescript
// ✅ Good: Use environment variables
const credentials = {
  apiKey: process.env.KALSHI_API_KEY,
  apiSecret: process.env.KALSHI_API_SECRET
};

// ❌ Bad: Hardcoded credentials
const credentials = {
  apiKey: 'key_123abc...',
  apiSecret: 'secret_456def...'
};
```

### 2. Response Validation

```typescript
import { z } from 'zod';

const MarketSchema = z.object({
  ticker: z.string(),
  title: z.string(),
  yes_bid: z.number().min(0).max(1),
  yes_ask: z.number().min(0).max(1),
  volume: z.number().nonnegative(),
  close_time: z.number()
});

function validateMarket(data: unknown) {
  return MarketSchema.parse(data);
}
```

### 3. Caching Strategy

```typescript
class APICache {
  private cache = new Map<string, { data: any, expiry: number }>();

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    const cached = this.cache.get(key);

    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const data = await fetcher();
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });

    return data;
  }
}

// Usage
const cache = new APICache();
const markets = await cache.get(
  'kalshi:markets',
  () => fetchKalshiMarkets(credentials),
  60000  // 60 second TTL
);
```

### 4. Logging & Monitoring

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'api.log' })
  ]
});

async function fetchWithLogging(url: string) {
  const startTime = Date.now();

  try {
    const response = await fetch(url);
    const duration = Date.now() - startTime;

    logger.info('API request', {
      url,
      status: response.status,
      duration
    });

    return response;
  } catch (error) {
    logger.error('API request failed', {
      url,
      error: error.message,
      duration: Date.now() - startTime
    });

    throw error;
  }
}
```

### 5. Graceful Degradation

```typescript
async function getMarketData(platform: 'kalshi' | 'polymarket') {
  try {
    const data = await fetchMarkets(platform);
    return { data, source: 'api', stale: false };
  } catch (error) {
    logger.warn(`${platform} API unavailable, using cache`);

    // Fall back to cached data
    const cached = await cache.get(`${platform}:markets:backup`);
    if (cached) {
      return { data: cached, source: 'cache', stale: true };
    }

    // Last resort: empty data with error flag
    return { data: [], source: 'none', error: error.message };
  }
}
```

---

## Additional Resources

### Kalshi
- [API Documentation](https://docs.kalshi.com)
- [API Status Page](https://status.kalshi.com)
- [Developer Discord](https://discord.gg/kalshi)

### Polymarket
- [API Documentation](https://docs.polymarket.com)
- [GitHub Examples](https://github.com/Polymarket)
- [Developer Forum](https://forum.polymarket.com)

### Tools
- [Postman Collection](./postman/arbitrage-markets.json) - Import for testing
- [Rate Limit Calculator](./tools/rate-limit-calc.ts) - Plan API usage
- [Credential Validator](./tools/validate-credentials.ts) - Test API access

---

For integration examples, see the `src/services/` directory in the codebase.
