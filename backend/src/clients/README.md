# Polymarket API Client

A comprehensive TypeScript client for accessing Polymarket's prediction markets through their public APIs.

## Overview

The Polymarket client provides a unified interface to interact with:
- **Gamma API**: Market metadata, volume, categorization
- **CLOB API**: Order book data and real-time prices

## Features

- **Multiple API Support**: Integrates both Gamma (market metadata) and CLOB (order books) APIs
- **In-Memory Caching**: Configurable TTL-based caching to reduce API calls
- **Rate Limiting**: Token bucket implementation (1000 calls/hour default)
- **Automatic Retry**: Exponential backoff for failed requests
- **Error Handling**: Comprehensive error handling with meaningful messages
- **Type Safety**: Full TypeScript support with detailed interfaces
- **Market Normalization**: Converts Polymarket data to common Market interface

## Installation

```bash
npm install axios
# or
yarn add axios
```

## Quick Start

```typescript
import { PolymarketClient } from './clients/polymarket';

// Create client with default settings
const client = new PolymarketClient();

// Fetch active markets
const markets = await client.getMarkets({ limit: 10, active: true });

// Get a specific market
const market = await client.getMarket('0xdd22472e...');

// Get current prices
const { yesPrice, noPrice } = await client.getMarketPrices('0xdd22472e...');

// Search markets
const results = await client.searchMarkets('election');

// Normalize to common format
const normalized = client.normalizeMarket(market);
```

## API Reference

### Constructor

```typescript
new PolymarketClient(
  gammaURL?: string,    // Default: 'https://gamma-api.polymarket.com'
  clobURL?: string,     // Default: 'https://clob.polymarket.com'
  rateLimit?: number    // Default: 1000 (requests per hour)
)
```

### Methods

#### `getMarkets(params?)`

Retrieves multiple markets with optional filtering.

**Parameters:**
- `limit?: number` - Maximum number of results (default: 100)
- `offset?: number` - Pagination offset (default: 0)
- `closed?: boolean` - Filter by closed status
- `active?: boolean` - Filter by active status
- `archived?: boolean` - Filter by archived status
- `order?: 'volume' | 'liquidity' | 'createdAt'` - Sort order

**Returns:** `Promise<PolymarketMarket[]>`

#### `getMarket(conditionId)`

Retrieves a single market by its condition ID.

**Parameters:**
- `conditionId: string` - The unique condition ID (hex string)

**Returns:** `Promise<PolymarketMarket>`

#### `getMarketPrices(conditionId)`

Gets current market prices from CLOB or falls back to outcomePrices.

**Parameters:**
- `conditionId: string` - The unique condition ID

**Returns:** `Promise<{ yesPrice: number; noPrice: number }>`

#### `searchMarkets(query, limit?)`

Searches markets by keyword (client-side filtering).

**Parameters:**
- `query: string` - Search query
- `limit?: number` - Maximum results (default: 20)

**Returns:** `Promise<PolymarketMarket[]>`

#### `getEvents(params?)`

Retrieves events (which can contain multiple markets).

**Parameters:**
- `limit?: number` - Maximum number of results
- `offset?: number` - Pagination offset
- `closed?: boolean` - Filter by closed status
- `archived?: boolean` - Filter by archived status

**Returns:** `Promise<PolymarketEvent[]>`

#### `normalizeMarket(polyMarket)`

Converts a Polymarket market to the common Market interface.

**Parameters:**
- `polyMarket: PolymarketMarket` - Polymarket-specific market data

**Returns:** `Market`

#### Cache Management

```typescript
client.clearCache()                 // Clear all cached data
client.getCacheStats()              // Get cache statistics
```

## Types

### PolymarketMarket

```typescript
interface PolymarketMarket {
  conditionId: string;              // Unique condition ID (hex)
  question: string;                 // Market question
  description?: string;             // Market description
  slug?: string;                    // URL slug
  outcomes: string | string[];      // Possible outcomes
  outcomePrices: string | number[]; // Current prices
  volume?: string | number;         // Trading volume
  liquidity?: string | number;      // Market liquidity
  active?: boolean;                 // Is market active
  closed?: boolean;                 // Is market closed
  tokens?: PolymarketToken[];       // Token information
  // ... additional fields
}
```

### Market (Common Interface)

```typescript
interface Market {
  id: string;                       // Unique identifier
  platform: string;                 // Platform name
  question: string;                 // Market question
  outcomes: string[];               // Possible outcomes
  prices: number[];                 // Current prices (0-1)
  volume: number;                   // Trading volume in USD
  active: boolean;                  // Is market active
  closed: boolean;                  // Is market closed
  resolved: boolean;                // Is market resolved
  // ... additional fields
}
```

## Caching Strategy

The client implements intelligent caching with different TTLs:

- **Markets & Market Details**: 60 seconds
- **Prices**: 5 seconds (more frequent updates)
- **Search Results**: 60 seconds

Cache is automatically invalidated when entries expire.

## Rate Limiting

Uses a token bucket algorithm to enforce rate limits:
- Default: 1000 requests/hour (free tier)
- Automatically waits when rate limit is exceeded
- Respects `Retry-After` headers from API responses

## Error Handling

The client implements robust error handling:

1. **Automatic Retry**: Up to 3 attempts with exponential backoff
2. **Rate Limit Handling**: Waits and retries when rate limited (429)
3. **Server Errors**: Retries on 5xx errors
4. **Network Errors**: Retries on timeout/connection issues
5. **Client Errors**: Immediately throws for 4xx errors (except 429)

## Important API Quirks

### 1. Data Format Inconsistencies

Polymarket APIs sometimes return data in different formats:
- `outcomes` can be a string, comma-separated string, or array
- `outcomePrices` can be a stringified JSON array or actual array
- Numbers may be strings or numbers

**Solution**: The client includes parsing methods that handle all variations.

### 2. Condition IDs vs Market IDs

- `conditionId`: Primary identifier (hex string starting with 0x)
- `id`: Numeric market ID (less commonly used)

**Recommendation**: Use `conditionId` for all market operations.

### 3. Price Sources

Prices can come from:
1. **CLOB API**: Real-time order book data (requires token IDs)
2. **Gamma API**: `outcomePrices` field (may be delayed)

The client tries CLOB first and falls back to outcomePrices.

### 4. Token Structure

Each market has tokens for each outcome:
```typescript
{
  token_id: string,  // Used for CLOB API calls
  outcome: string,   // "Yes" or "No"
  price?: number
}
```

### 5. Binary Markets

Most Polymarket markets are binary (Yes/No), but some have multiple outcomes. The client defaults to binary format when data is ambiguous.

### 6. Gamma API Deprecation

**Warning**: As of our research, Polymarket is rebuilding the Gamma API. The current endpoints still work but may change. Consider using the alternative endpoint mentioned: `https://strapi-matic.poly.market` for production applications.

### 7. No Authentication Required

The public Gamma and CLOB endpoints don't require API keys for read operations. Trading operations require authentication.

## Testing

Run the built-in test function:

```bash
ts-node backend/src/clients/polymarket.ts
```

This will:
1. Fetch active markets
2. Get a single market's details
3. Retrieve market prices
4. Normalize market data
5. Search markets
6. Display cache statistics

## Example Usage

### Fetching Top Markets by Volume

```typescript
const markets = await client.getMarkets({
  limit: 10,
  active: true,
  order: 'volume'
});

markets.forEach(market => {
  console.log(`${market.question} - Volume: $${market.volume}`);
});
```

### Finding Arbitrage Opportunities

```typescript
// Get market from Polymarket
const polyMarket = await client.getMarket('0x123...');
const polyNormalized = client.normalizeMarket(polyMarket);

// Compare with Kalshi (when implemented)
// const kalshiMarket = await kalshiClient.getMarket('...');
// const arbitrage = compareMarkets(polyNormalized, kalshiMarket);
```

### Real-time Price Monitoring

```typescript
async function monitorPrices(conditionId: string) {
  setInterval(async () => {
    const { yesPrice, noPrice } = await client.getMarketPrices(conditionId);
    console.log(`Yes: ${(yesPrice * 100).toFixed(2)}% | No: ${(noPrice * 100).toFixed(2)}%`);
  }, 5000); // Every 5 seconds
}
```

## Performance Considerations

1. **Use Caching**: The built-in cache significantly reduces API calls
2. **Batch Requests**: Use `getMarkets()` instead of multiple `getMarket()` calls
3. **Rate Limit Awareness**: Monitor your usage to avoid hitting limits
4. **Price Updates**: Use appropriate polling intervals (5-10 seconds recommended)

## Roadmap

Future enhancements:
- [ ] Redis integration for distributed caching
- [ ] WebSocket support for real-time updates
- [ ] Historical data fetching
- [ ] Advanced filtering and search
- [ ] Trading operations (requires authentication)
- [ ] Market creation monitoring

## Resources

- [Polymarket Documentation](https://docs.polymarket.com)
- [Gamma API Overview](https://docs.polymarket.com/developers/gamma-markets-api/overview)
- [CLOB API Documentation](https://docs.polymarket.com/developers/CLOB/introduction)
- [Polymarket Agents (Python Examples)](https://github.com/Polymarket/agents)

## License

Part of the ArbitrageMarkets platform.
