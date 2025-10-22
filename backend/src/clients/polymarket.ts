/**
 * Polymarket API Client
 *
 * This client provides access to Polymarket's prediction markets through their public APIs:
 * - Gamma API: Market metadata, volume, categorization
 * - CLOB API: Order book data and real-time prices
 *
 * @see https://docs.polymarket.com
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { Market } from '../types';

/**
 * Polymarket-specific market interface matching their API response
 */
export interface PolymarketMarket {
  /** Unique condition ID (hex string) */
  conditionId: string;

  /** Market ID */
  id?: string;

  /** Question being asked */
  question: string;

  /** Market description */
  description?: string;

  /** URL slug */
  slug?: string;

  /** Possible outcomes (comma-separated string or array) */
  outcomes: string | string[];

  /** Current outcome prices (stringified JSON array or array) */
  outcomePrices: string | number[];

  /** Trading volume */
  volume?: string | number;

  /** Volume in 24 hours */
  volume24hr?: string | number;

  /** Liquidity */
  liquidity?: string | number;

  /** Market start timestamp */
  startDate?: string;

  /** Market end timestamp */
  endDate?: string;

  /** Market creation timestamp */
  createdAt?: string;

  /** Whether market is active */
  active?: boolean;

  /** Whether market is closed */
  closed?: boolean;

  /** Whether market is archived */
  archived?: boolean;

  /** Market category */
  category?: string;

  /** Market tags */
  tags?: string[];

  /** Token information */
  tokens?: PolymarketToken[];

  /** CLOB token IDs (stringified JSON array or array) */
  clobTokenIds?: string | string[];

  /** Number of traders */
  traders?: number;

  /** Denomination token (usually USDC) */
  denominationToken?: string;

  /** Resolution criteria/rules */
  rules?: string;

  /** Additional metadata */
  [key: string]: any;
}

/**
 * Polymarket token information
 */
export interface PolymarketToken {
  token_id: string;
  outcome: string;
  price?: number;
  winner?: boolean;
}

/**
 * Polymarket event (can contain multiple markets)
 */
export interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  markets: PolymarketMarket[];
  closed?: boolean;
  archived?: boolean;
}

/**
 * CLOB order book response
 */
export interface PolymarketOrderBook {
  market: string;
  asset_id: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  timestamp: number;
}

/**
 * CLOB price response
 */
export interface PolymarketPrice {
  price: string;
  side: 'BUY' | 'SELL';
}

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Rate limiter token bucket
 */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond

  /**
   * Creates a new rate limiter
   * @param maxRequests Maximum requests allowed per period
   * @param periodMs Time period in milliseconds
   */
  constructor(maxRequests: number, periodMs: number) {
    this.maxTokens = maxRequests;
    this.tokens = maxRequests;
    this.lastRefill = Date.now();
    this.refillRate = maxRequests / periodMs;
  }

  /**
   * Attempts to consume a token, waiting if necessary
   */
  async consume(): Promise<void> {
    this.refill();

    if (this.tokens < 1) {
      const waitTime = (1 - this.tokens) / this.refillRate;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.refill();
    }

    this.tokens -= 1;
  }

  /**
   * Refills tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

/**
 * Polymarket API Client
 *
 * Features:
 * - Access to Gamma API for market metadata
 * - Access to CLOB API for real-time prices
 * - In-memory caching with configurable TTL
 * - Automatic retry with exponential backoff
 * - Rate limiting (1000 calls/hour for free tier)
 * - Comprehensive error handling
 */
export class PolymarketClient {
  private readonly gammaAPI: AxiosInstance;
  private readonly clobAPI: AxiosInstance;
  private readonly cache: Map<string, CacheEntry<any>>;
  private readonly rateLimiter: RateLimiter;
  private readonly defaultCacheTTL: number = 60000; // 60 seconds
  private readonly maxRetries: number = 3;
  private readonly initialRetryDelay: number = 1000; // 1 second

  /**
   * Creates a new Polymarket client
   *
   * @param gammaURL Base URL for Gamma API (default: https://gamma-api.polymarket.com)
   * @param clobURL Base URL for CLOB API (default: https://clob.polymarket.com)
   * @param rateLimit Maximum requests per hour (default: 1000)
   */
  constructor(
    gammaURL: string = 'https://gamma-api.polymarket.com',
    clobURL: string = 'https://clob.polymarket.com',
    rateLimit: number = 1000
  ) {
    // Initialize Gamma API client
    this.gammaAPI = axios.create({
      baseURL: gammaURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Initialize CLOB API client
    this.clobAPI = axios.create({
      baseURL: clobURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Initialize cache
    this.cache = new Map();

    // Initialize rate limiter (requests per hour converted to per millisecond)
    this.rateLimiter = new RateLimiter(rateLimit, 3600000);
  }

  /**
   * Retrieves all markets from Polymarket
   *
   * @param params Query parameters for filtering and pagination
   * @returns Array of Polymarket markets
   *
   * @example
   * ```typescript
   * const markets = await client.getMarkets({ limit: 10, active: true });
   * ```
   */
  async getMarkets(params?: {
    limit?: number;
    offset?: number;
    closed?: boolean;
    active?: boolean;
    archived?: boolean;
    order?: 'volume' | 'liquidity' | 'createdAt';
  }): Promise<PolymarketMarket[]> {
    const cacheKey = `markets:${JSON.stringify(params || {})}`;

    // Check cache first
    const cached = this.getFromCache<PolymarketMarket[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build query parameters
    const queryParams: Record<string, any> = {
      limit: params?.limit || 100,
      offset: params?.offset || 0,
    };

    if (params?.closed !== undefined) {
      queryParams.closed = params.closed;
    }
    if (params?.active !== undefined) {
      queryParams.active = params.active;
    }
    if (params?.archived !== undefined) {
      queryParams.archived = params.archived;
    }
    if (params?.order) {
      queryParams.order = params.order;
    }

    const markets = await this.makeRequest<PolymarketMarket[]>(
      () => this.gammaAPI.get('/markets', { params: queryParams }),
      'Failed to fetch markets'
    );

    // Cache the results
    this.setCache(cacheKey, markets, this.defaultCacheTTL);

    return markets;
  }

  /**
   * Retrieves a single market by its condition ID
   *
   * @param conditionId The unique condition ID for the market
   * @returns Polymarket market data
   *
   * @example
   * ```typescript
   * const market = await client.getMarket('0xdd22472e...');
   * ```
   */
  async getMarket(conditionId: string): Promise<PolymarketMarket> {
    const cacheKey = `market:${conditionId}`;

    // Check cache first
    const cached = this.getFromCache<PolymarketMarket>(cacheKey);
    if (cached) {
      return cached;
    }

    const market = await this.makeRequest<PolymarketMarket>(
      () => this.gammaAPI.get(`/markets/${conditionId}`),
      `Failed to fetch market ${conditionId}`
    );

    // Cache the result
    this.setCache(cacheKey, market, this.defaultCacheTTL);

    return market;
  }

  /**
   * Retrieves current market prices from the CLOB
   *
   * Note: This method attempts to get prices from the order book.
   * If the market doesn't have CLOB token IDs, it falls back to outcomePrices.
   *
   * @param conditionId The unique condition ID for the market
   * @returns Object containing yes and no prices (0-1 range)
   *
   * @example
   * ```typescript
   * const { yesPrice, noPrice } = await client.getMarketPrices('0xdd22472e...');
   * ```
   */
  async getMarketPrices(conditionId: string): Promise<{ yesPrice: number; noPrice: number }> {
    const cacheKey = `prices:${conditionId}`;

    // Check cache first
    const cached = this.getFromCache<{ yesPrice: number; noPrice: number }>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // First, get the market to find token IDs
      const market = await this.getMarket(conditionId);

      let yesPrice = 0.5;
      let noPrice = 0.5;

      // Try to get prices from CLOB if token IDs are available
      if (market.tokens && market.tokens.length >= 2) {
        const yesToken = market.tokens.find(t => t.outcome === 'Yes');
        const noToken = market.tokens.find(t => t.outcome === 'No');

        if (yesToken?.token_id && noToken?.token_id) {
          try {
            // Get order books for both tokens
            const yesBook = await this.makeRequest<PolymarketOrderBook>(
              () => this.clobAPI.get('/book', { params: { token_id: yesToken.token_id } }),
              'Failed to fetch YES order book',
              false // Don't throw on failure, use fallback
            );

            const noBook = await this.makeRequest<PolymarketOrderBook>(
              () => this.clobAPI.get('/book', { params: { token_id: noToken.token_id } }),
              'Failed to fetch NO order book',
              false
            );

            // Use mid price from order book (average of best bid and ask)
            if (yesBook && yesBook.asks.length > 0 && yesBook.bids.length > 0) {
              yesPrice = (parseFloat(yesBook.asks[0].price) + parseFloat(yesBook.bids[0].price)) / 2;
            }
            if (noBook && noBook.asks.length > 0 && noBook.bids.length > 0) {
              noPrice = (parseFloat(noBook.asks[0].price) + parseFloat(noBook.bids[0].price)) / 2;
            }
          } catch (error) {
            // Fall through to use outcomePrices
          }
        }
      }

      // Fallback to outcomePrices if CLOB prices aren't available
      if (yesPrice === 0.5 && noPrice === 0.5 && market.outcomePrices) {
        const prices = this.parseOutcomePrices(market.outcomePrices);
        if (prices.length >= 2) {
          yesPrice = prices[0];
          noPrice = prices[1];
        }
      }

      const result = { yesPrice, noPrice };

      // Cache for shorter duration (prices change frequently)
      this.setCache(cacheKey, result, 5000); // 5 seconds

      return result;
    } catch (error) {
      throw new Error(`Failed to get market prices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Searches markets by keyword
   *
   * @param query Search query string
   * @param limit Maximum number of results (default: 20)
   * @returns Array of matching markets
   *
   * @example
   * ```typescript
   * const markets = await client.searchMarkets('election');
   * ```
   */
  async searchMarkets(query: string, limit: number = 20): Promise<PolymarketMarket[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const cacheKey = `search:${query}:${limit}`;

    // Check cache first
    const cached = this.getFromCache<PolymarketMarket[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Polymarket doesn't have a dedicated search endpoint in Gamma API
    // So we fetch markets and filter client-side
    // For production, consider using their Events API or implementing server-side search
    const allMarkets = await this.getMarkets({ limit: 100, active: true });

    const queryLower = query.toLowerCase();
    const filtered = allMarkets.filter(market => {
      const questionMatch = market.question?.toLowerCase().includes(queryLower);
      const descriptionMatch = market.description?.toLowerCase().includes(queryLower);
      const categoryMatch = market.category?.toLowerCase().includes(queryLower);
      const tagsMatch = market.tags?.some(tag => tag.toLowerCase().includes(queryLower));

      return questionMatch || descriptionMatch || categoryMatch || tagsMatch;
    }).slice(0, limit);

    // Cache search results
    this.setCache(cacheKey, filtered, this.defaultCacheTTL);

    return filtered;
  }

  /**
   * Retrieves events (which can contain multiple markets)
   *
   * @param params Query parameters for filtering and pagination
   * @returns Array of Polymarket events
   *
   * @example
   * ```typescript
   * const events = await client.getEvents({ limit: 10 });
   * ```
   */
  async getEvents(params?: {
    limit?: number;
    offset?: number;
    closed?: boolean;
    archived?: boolean;
  }): Promise<PolymarketEvent[]> {
    const queryParams: Record<string, any> = {
      limit: params?.limit || 100,
      offset: params?.offset || 0,
    };

    if (params?.closed !== undefined) {
      queryParams.closed = params.closed;
    }
    if (params?.archived !== undefined) {
      queryParams.archived = params.archived;
    }

    const events = await this.makeRequest<PolymarketEvent[]>(
      () => this.gammaAPI.get('/events', { params: queryParams }),
      'Failed to fetch events'
    );

    return events;
  }

  /**
   * Normalizes a Polymarket market to the common Market interface
   *
   * @param polyMarket Polymarket-specific market data
   * @returns Normalized market following the common interface
   *
   * @example
   * ```typescript
   * const polyMarket = await client.getMarket('0x123...');
   * const normalized = client.normalizeMarket(polyMarket);
   * ```
   */
  normalizeMarket(polyMarket: PolymarketMarket): Market {
    // Parse outcomes
    const outcomes = this.parseOutcomes(polyMarket.outcomes);

    // Parse prices
    const prices = this.parseOutcomePrices(polyMarket.outcomePrices);

    // Parse volume
    const volume = this.parseNumber(polyMarket.volume);

    // Parse liquidity
    const liquidity = this.parseNumber(polyMarket.liquidity);

    // Determine if market is active, closed, or resolved
    const active = polyMarket.active ?? !polyMarket.closed ?? true;
    const closed = polyMarket.closed ?? false;
    const resolved = polyMarket.archived ?? false;

    // Parse timestamps
    const createdAt = polyMarket.createdAt
      ? new Date(polyMarket.createdAt)
      : new Date();

    const closesAt = polyMarket.endDate
      ? new Date(polyMarket.endDate)
      : undefined;

    return {
      id: polyMarket.conditionId,
      platform: 'polymarket',
      question: polyMarket.question,
      description: polyMarket.description,
      slug: polyMarket.slug,
      outcomes,
      prices,
      volume,
      liquidity,
      traderCount: polyMarket.traders,
      createdAt,
      closesAt,
      active,
      closed,
      resolved,
      resolutionCriteria: polyMarket.rules,
      category: polyMarket.category,
      tags: polyMarket.tags,
      metadata: {
        conditionId: polyMarket.conditionId,
        clobTokenIds: polyMarket.clobTokenIds,
        tokens: polyMarket.tokens,
        denominationToken: polyMarket.denominationToken,
        volume24hr: polyMarket.volume24hr,
      },
    };
  }

  /**
   * Parses outcomes from string or array format
   */
  private parseOutcomes(outcomes: string | string[]): string[] {
    if (Array.isArray(outcomes)) {
      return outcomes;
    }

    if (typeof outcomes === 'string') {
      try {
        const parsed = JSON.parse(outcomes);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Not JSON, try splitting by comma
        return outcomes.split(',').map(o => o.trim());
      }
    }

    return ['Yes', 'No']; // Default for binary markets
  }

  /**
   * Parses outcome prices from string or array format
   */
  private parseOutcomePrices(outcomePrices: string | number[]): number[] {
    if (Array.isArray(outcomePrices)) {
      return outcomePrices.map(p => typeof p === 'string' ? parseFloat(p) : p);
    }

    if (typeof outcomePrices === 'string') {
      try {
        const parsed = JSON.parse(outcomePrices);
        if (Array.isArray(parsed)) {
          return parsed.map(p => typeof p === 'string' ? parseFloat(p) : p);
        }
      } catch {
        // Failed to parse
      }
    }

    return [0.5, 0.5]; // Default for binary markets
  }

  /**
   * Parses a number from string or number format
   */
  private parseNumber(value: string | number | undefined): number {
    if (value === undefined || value === null) {
      return 0;
    }

    if (typeof value === 'number') {
      return value;
    }

    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Makes an HTTP request with retry logic and rate limiting
   *
   * @param requestFn Function that returns an Axios promise
   * @param errorMessage Error message to throw on failure
   * @param throwOnError Whether to throw on error (default: true)
   * @returns Response data
   */
  private async makeRequest<T>(
    requestFn: () => Promise<any>,
    errorMessage: string,
    throwOnError: boolean = true
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Apply rate limiting
        await this.rateLimiter.consume();

        // Make the request
        const response = await requestFn();

        // Return the data
        return response.data;
      } catch (error) {
        lastError = error as Error;

        // Check if it's a rate limit error (429)
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.calculateBackoff(attempt);

          console.warn(`Rate limited. Retrying after ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        // Check if it's a server error (5xx) or network error
        if (
          axios.isAxiosError(error) &&
          (error.response?.status && error.response.status >= 500) ||
          error.code === 'ECONNABORTED' ||
          error.code === 'ETIMEDOUT'
        ) {
          const delay = this.calculateBackoff(attempt);
          console.warn(`Request failed (attempt ${attempt + 1}/${this.maxRetries}). Retrying after ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        // For other errors, break immediately
        break;
      }
    }

    // All retries exhausted
    if (throwOnError) {
      throw new Error(`${errorMessage}: ${lastError?.message || 'Unknown error'}`);
    }

    return null as T;
  }

  /**
   * Calculates exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    return this.initialRetryDelay * Math.pow(2, attempt);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retrieves data from cache if not expired
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Stores data in cache with TTL
   */
  private setCache<T>(key: string, data: T, ttl: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    this.cache.set(key, entry);
  }

  /**
   * Clears all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/**
 * Testing helper function
 * Run this file directly with: ts-node polymarket.ts
 */
async function testPolymarketClient() {
  console.log('🧪 Testing Polymarket Client...\n');

  const client = new PolymarketClient();

  try {
    // Test 1: Fetch markets
    console.log('📊 Test 1: Fetching active markets...');
    const markets = await client.getMarkets({ limit: 5, active: true });
    console.log(`✅ Found ${markets.length} markets`);

    if (markets.length > 0) {
      const firstMarket = markets[0];
      console.log(`\nFirst market:`);
      console.log(`  Question: ${firstMarket.question}`);
      console.log(`  Condition ID: ${firstMarket.conditionId}`);
      console.log(`  Volume: ${firstMarket.volume}`);
      console.log(`  Outcomes: ${firstMarket.outcomes}`);

      // Test 2: Get single market
      console.log(`\n📈 Test 2: Fetching single market details...`);
      const market = await client.getMarket(firstMarket.conditionId);
      console.log(`✅ Market fetched: ${market.question}`);

      // Test 3: Get market prices
      console.log(`\n💰 Test 3: Fetching market prices...`);
      try {
        const { yesPrice, noPrice } = await client.getMarketPrices(firstMarket.conditionId);
        console.log(`✅ Prices - Yes: ${(yesPrice * 100).toFixed(2)}%, No: ${(noPrice * 100).toFixed(2)}%`);
      } catch (error) {
        console.log(`⚠️  Price fetch failed (may not have CLOB data): ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Test 4: Normalize market
      console.log(`\n🔄 Test 4: Normalizing market data...`);
      const normalized = client.normalizeMarket(firstMarket);
      console.log(`✅ Normalized market:`);
      console.log(`  Platform: ${normalized.platform}`);
      console.log(`  Question: ${normalized.question}`);
      console.log(`  Outcomes: ${normalized.outcomes.join(', ')}`);
      console.log(`  Prices: ${normalized.prices.map(p => (p * 100).toFixed(2) + '%').join(', ')}`);
      console.log(`  Volume: $${normalized.volume.toLocaleString()}`);
    }

    // Test 5: Search markets
    console.log(`\n🔍 Test 5: Searching for "trump" markets...`);
    const searchResults = await client.searchMarkets('trump', 3);
    console.log(`✅ Found ${searchResults.length} matching markets`);
    searchResults.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.question}`);
    });

    // Test 6: Cache stats
    console.log(`\n💾 Test 6: Cache statistics...`);
    const cacheStats = client.getCacheStats();
    console.log(`✅ Cache contains ${cacheStats.size} entries`);

    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response:', error.response?.data);
      console.error('Status:', error.response?.status);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testPolymarketClient();
}

export default PolymarketClient;
