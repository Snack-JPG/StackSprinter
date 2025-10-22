/**
 * Redis Cache Service
 *
 * Provides high-speed caching for market data and opportunities.
 * Reduces API calls and improves response times with configurable TTLs.
 *
 * Default TTLs:
 * - Markets: 60 seconds
 * - Opportunities: 30 seconds
 */

import Redis from 'ioredis';

// Redis client configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: false,
};

// Cache key prefixes for organization
const CACHE_PREFIXES = {
  MARKETS: 'markets',
  OPPORTUNITY: 'opportunity',
  MATCHED_PAIRS: 'matched_pairs',
  STATS: 'stats',
} as const;

// Default TTL values in seconds
const DEFAULT_TTL = {
  MARKETS: 60, // 1 minute
  OPPORTUNITIES: 30, // 30 seconds
  MATCHED_PAIRS: 120, // 2 minutes
  STATS: 300, // 5 minutes
} as const;

export interface CachedMarket {
  id: string;
  platform: string;
  marketId: string;
  title: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  lastUpdated: string;
}

export interface CachedOpportunity {
  id: string;
  matchedPairId: string;
  kalshiPrice: number;
  polymarketPrice: number;
  spread: number;
  netProfit: number;
  riskScore: number;
  detectedAt: string;
}

export class CacheService {
  private redis: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.redis = new Redis(redisConfig);
    this.setupEventHandlers();
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('Redis: Connected successfully');
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      console.error('Redis: Connection error', error);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      console.log('Redis: Connection closed');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      console.log('Redis: Reconnecting...');
    });
  }

  /**
   * Check if Redis is connected and healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Cache markets for a specific platform
   *
   * @param platform - 'kalshi' or 'polymarket'
   * @param markets - Array of market data
   * @param ttl - Time to live in seconds (default: 60s)
   */
  async cacheMarkets(
    platform: string,
    markets: CachedMarket[],
    ttl: number = DEFAULT_TTL.MARKETS
  ): Promise<void> {
    const key = `${CACHE_PREFIXES.MARKETS}:${platform}`;
    try {
      await this.redis.setex(key, ttl, JSON.stringify(markets));
    } catch (error) {
      console.error(`Failed to cache markets for ${platform}:`, error);
      // Non-blocking: cache failures shouldn't break the application
    }
  }

  /**
   * Retrieve cached markets for a platform
   *
   * @param platform - 'kalshi' or 'polymarket'
   * @returns Cached markets or null if not found/expired
   */
  async getMarkets(platform: string): Promise<CachedMarket[] | null> {
    const key = `${CACHE_PREFIXES.MARKETS}:${platform}`;
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Failed to retrieve cached markets for ${platform}:`, error);
      return null;
    }
  }

  /**
   * Cache a single opportunity
   *
   * @param opportunity - Opportunity data
   * @param ttl - Time to live in seconds (default: 30s)
   */
  async cacheOpportunity(
    opportunity: CachedOpportunity,
    ttl: number = DEFAULT_TTL.OPPORTUNITIES
  ): Promise<void> {
    const key = `${CACHE_PREFIXES.OPPORTUNITY}:${opportunity.id}`;
    try {
      await this.redis.setex(key, ttl, JSON.stringify(opportunity));
    } catch (error) {
      console.error(`Failed to cache opportunity ${opportunity.id}:`, error);
    }
  }

  /**
   * Cache multiple opportunities
   *
   * @param opportunities - Array of opportunities
   * @param ttl - Time to live in seconds (default: 30s)
   */
  async cacheOpportunities(
    opportunities: CachedOpportunity[],
    ttl: number = DEFAULT_TTL.OPPORTUNITIES
  ): Promise<void> {
    const key = `${CACHE_PREFIXES.OPPORTUNITY}:list`;
    try {
      await this.redis.setex(key, ttl, JSON.stringify(opportunities));
    } catch (error) {
      console.error('Failed to cache opportunities:', error);
    }
  }

  /**
   * Get cached opportunity by ID
   */
  async getOpportunity(id: string): Promise<CachedOpportunity | null> {
    const key = `${CACHE_PREFIXES.OPPORTUNITY}:${id}`;
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Failed to retrieve opportunity ${id}:`, error);
      return null;
    }
  }

  /**
   * Get cached opportunities list
   */
  async getOpportunities(): Promise<CachedOpportunity[] | null> {
    const key = `${CACHE_PREFIXES.OPPORTUNITY}:list`;
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to retrieve opportunities:', error);
      return null;
    }
  }

  /**
   * Cache matched pairs
   */
  async cacheMatchedPairs(
    pairs: any[],
    ttl: number = DEFAULT_TTL.MATCHED_PAIRS
  ): Promise<void> {
    const key = `${CACHE_PREFIXES.MATCHED_PAIRS}:list`;
    try {
      await this.redis.setex(key, ttl, JSON.stringify(pairs));
    } catch (error) {
      console.error('Failed to cache matched pairs:', error);
    }
  }

  /**
   * Get cached matched pairs
   */
  async getMatchedPairs(): Promise<any[] | null> {
    const key = `${CACHE_PREFIXES.MATCHED_PAIRS}:list`;
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to retrieve matched pairs:', error);
      return null;
    }
  }

  /**
   * Cache statistics data
   */
  async cacheStats(
    statsKey: string,
    stats: any,
    ttl: number = DEFAULT_TTL.STATS
  ): Promise<void> {
    const key = `${CACHE_PREFIXES.STATS}:${statsKey}`;
    try {
      await this.redis.setex(key, ttl, JSON.stringify(stats));
    } catch (error) {
      console.error(`Failed to cache stats ${statsKey}:`, error);
    }
  }

  /**
   * Get cached statistics
   */
  async getStats(statsKey: string): Promise<any | null> {
    const key = `${CACHE_PREFIXES.STATS}:${statsKey}`;
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Failed to retrieve stats ${statsKey}:`, error);
      return null;
    }
  }

  /**
   * Clear cache by pattern
   *
   * @param pattern - Redis key pattern (e.g., 'markets:*', 'opportunity:*')
   */
  async clearCache(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      await this.redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.error(`Failed to clear cache for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Clear all market cache
   */
  async clearMarketCache(): Promise<number> {
    return this.clearCache(`${CACHE_PREFIXES.MARKETS}:*`);
  }

  /**
   * Clear all opportunity cache
   */
  async clearOpportunityCache(): Promise<number> {
    return this.clearCache(`${CACHE_PREFIXES.OPPORTUNITY}:*`);
  }

  /**
   * Clear all cache
   */
  async clearAllCache(): Promise<void> {
    try {
      await this.redis.flushdb();
      console.log('Redis: All cache cleared');
    } catch (error) {
      console.error('Failed to clear all cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsed: string;
    isConnected: boolean;
  }> {
    try {
      const info = await this.redis.info('memory');
      const keys = await this.redis.dbsize();

      // Parse memory usage from info
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsed = memoryMatch ? memoryMatch[1].trim() : 'Unknown';

      return {
        totalKeys: keys,
        memoryUsed,
        isConnected: this.isConnected,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsed: 'Unknown',
        isConnected: false,
      };
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
    console.log('Redis: Disconnected');
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await cacheService.disconnect();
});

process.on('SIGINT', async () => {
  await cacheService.disconnect();
});

export default cacheService;
