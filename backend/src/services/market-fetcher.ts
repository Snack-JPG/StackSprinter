/**
 * Market Fetcher Service
 *
 * Polls Kalshi and Polymarket APIs to fetch market data.
 * Caches results and provides unified market data access.
 *
 * TODO: Implement actual polling mechanism with intervals
 * TODO: Add WebSocket streaming for real-time updates
 */

import { KalshiClient, createKalshiClient } from '../clients/kalshi';
import { PolymarketClient, createPolymarketClient } from '../clients/polymarket';
import { Market, Platform } from '../clients/types';
import { cacheService } from './cache';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export interface FetchMarketsOptions {
  platform?: Platform | 'all';
  status?: 'open' | 'closed' | 'all';
  limit?: number;
  useCache?: boolean;
}

export class MarketFetcherService {
  private kalshiClient: KalshiClient;
  private polymarketClient: PolymarketClient;
  private fetchInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor() {
    // Initialize API clients
    this.kalshiClient = createKalshiClient({
      baseUrl: env.KALSHI_API_BASE_URL,
      email: env.KALSHI_EMAIL,
      password: env.KALSHI_PASSWORD,
      rateLimit: env.KALSHI_RATE_LIMIT_PER_SECOND,
    });

    this.polymarketClient = createPolymarketClient({
      baseUrl: env.POLYMARKET_API_BASE_URL,
      apiKey: env.POLYMARKET_API_KEY,
      rateLimit: env.POLYMARKET_RATE_LIMIT_PER_SECOND,
    });

    logger.info('MarketFetcherService initialized');
  }

  /**
   * Start periodic market fetching
   */
  public start(): void {
    if (this.isRunning) {
      logger.warn('MarketFetcherService already running');
      return;
    }

    logger.info('Starting MarketFetcherService', {
      interval: env.MARKET_FETCH_INTERVAL_MS,
    });

    this.isRunning = true;

    // Fetch immediately on start
    this.fetchAndCacheAll().catch((error) => {
      logger.error('Initial market fetch failed', { error });
    });

    // Set up interval
    this.fetchInterval = setInterval(() => {
      this.fetchAndCacheAll().catch((error) => {
        logger.error('Periodic market fetch failed', { error });
      });
    }, env.MARKET_FETCH_INTERVAL_MS);
  }

  /**
   * Stop periodic market fetching
   */
  public stop(): void {
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
    }

    this.isRunning = false;
    logger.info('MarketFetcherService stopped');
  }

  /**
   * Fetch markets from all platforms and cache them
   */
  private async fetchAndCacheAll(): Promise<void> {
    logger.info('Fetching markets from all platforms');

    try {
      // Fetch from both platforms in parallel
      const [kalshiMarkets, polymarketMarkets] = await Promise.allSettled([
        this.fetchKalshiMarkets(),
        this.fetchPolymarketMarkets(),
      ]);

      // Handle Kalshi results
      if (kalshiMarkets.status === 'fulfilled') {
        await cacheService.cacheMarkets('kalshi', kalshiMarkets.value as any);
        logger.info(`Cached ${kalshiMarkets.value.length} Kalshi markets`);
      } else {
        logger.error('Failed to fetch Kalshi markets', {
          error: kalshiMarkets.reason,
        });
      }

      // Handle Polymarket results
      if (polymarketMarkets.status === 'fulfilled') {
        await cacheService.cacheMarkets('polymarket', polymarketMarkets.value as any);
        logger.info(`Cached ${polymarketMarkets.value.length} Polymarket markets`);
      } else {
        logger.error('Failed to fetch Polymarket markets', {
          error: polymarketMarkets.reason,
        });
      }
    } catch (error) {
      logger.error('Failed to fetch and cache markets', { error });
    }
  }

  /**
   * Fetch markets from Kalshi
   */
  private async fetchKalshiMarkets(): Promise<Market[]> {
    try {
      const markets = await this.kalshiClient.getMarkets({
        status: 'open',
        limit: 1000,
      });

      logger.debug(`Fetched ${markets.length} markets from Kalshi`);
      return markets;
    } catch (error) {
      logger.error('Failed to fetch Kalshi markets', { error });
      throw error;
    }
  }

  /**
   * Fetch markets from Polymarket
   */
  private async fetchPolymarketMarkets(): Promise<Market[]> {
    try {
      // TODO: Implement when Polymarket client is ready
      logger.warn('Polymarket market fetching not yet implemented');
      return [];
    } catch (error) {
      logger.error('Failed to fetch Polymarket markets', { error });
      throw error;
    }
  }

  /**
   * Get markets with optional filtering and caching
   */
  public async getMarkets(options: FetchMarketsOptions = {}): Promise<Market[]> {
    const {
      platform = 'all',
      status = 'open',
      limit = 100,
      useCache = true,
    } = options;

    try {
      // Try cache first if enabled
      if (useCache) {
        const cachedMarkets = await this.getCachedMarkets(platform);
        if (cachedMarkets && cachedMarkets.length > 0) {
          logger.debug('Returning cached markets', {
            platform,
            count: cachedMarkets.length,
          });
          return this.filterMarkets(cachedMarkets, status).slice(0, limit);
        }
      }

      // Fetch fresh data
      let markets: Market[] = [];

      if (platform === 'all') {
        const [kalshi, polymarket] = await Promise.all([
          this.fetchKalshiMarkets(),
          this.fetchPolymarketMarkets(),
        ]);
        markets = [...kalshi, ...polymarket];
      } else if (platform === 'kalshi') {
        markets = await this.fetchKalshiMarkets();
      } else if (platform === 'polymarket') {
        markets = await this.fetchPolymarketMarkets();
      }

      return this.filterMarkets(markets, status).slice(0, limit);
    } catch (error) {
      logger.error('Failed to get markets', { error, options });
      throw error;
    }
  }

  /**
   * Get a single market by platform and ID
   */
  public async getMarket(platform: Platform, id: string): Promise<Market | null> {
    try {
      if (platform === 'kalshi') {
        return await this.kalshiClient.getMarket(id);
      } else if (platform === 'polymarket') {
        return await this.polymarketClient.getMarket(id);
      }
      return null;
    } catch (error) {
      logger.error('Failed to get market', { error, platform, id });
      throw error;
    }
  }

  /**
   * Get cached markets for a platform
   */
  private async getCachedMarkets(platform: Platform | 'all'): Promise<Market[] | null> {
    try {
      if (platform === 'all') {
        const [kalshi, polymarket] = await Promise.all([
          cacheService.getMarkets('kalshi'),
          cacheService.getMarkets('polymarket'),
        ]);

        const allMarkets: Market[] = [];
        if (kalshi) allMarkets.push(...(kalshi as any));
        if (polymarket) allMarkets.push(...(polymarket as any));

        return allMarkets.length > 0 ? allMarkets : null;
      } else {
        return (await cacheService.getMarkets(platform)) as any;
      }
    } catch (error) {
      logger.error('Failed to get cached markets', { error, platform });
      return null;
    }
  }

  /**
   * Filter markets by status
   */
  private filterMarkets(markets: Market[], status: string): Market[] {
    if (status === 'all') {
      return markets;
    }
    return markets.filter((m) => m.status === status);
  }

  /**
   * Health check for both API clients
   */
  public async healthCheck(): Promise<{
    kalshi: boolean;
    polymarket: boolean;
    overall: boolean;
  }> {
    const [kalshi, polymarket] = await Promise.all([
      this.kalshiClient.healthCheck(),
      this.polymarketClient.healthCheck(),
    ]);

    return {
      kalshi,
      polymarket,
      overall: kalshi || polymarket, // At least one should work
    };
  }
}

// Export singleton instance
export const marketFetcherService = new MarketFetcherService();
