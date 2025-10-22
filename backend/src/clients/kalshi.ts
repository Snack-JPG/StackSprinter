/**
 * Kalshi API Client
 *
 * Implements authentication, rate limiting, and market data fetching
 * for the Kalshi prediction market platform.
 *
 * Features:
 * - Automatic token refresh (tokens expire every 30 minutes)
 * - Rate limiting protection
 * - Comprehensive error handling with retries
 * - Full TypeScript typing
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import Bottleneck from 'bottleneck';
import { Kalshi, Market, Platform } from './types';
import { logger } from '../utils/logger';

interface KalshiClientConfig {
  baseUrl: string;
  email: string;
  password: string;
  rateLimit?: number; // requests per second
}

interface AuthState {
  token: string | null;
  memberId: string | null;
  expiresAt: Date | null;
}

export class KalshiClient {
  private readonly config: KalshiClientConfig;
  private readonly httpClient: AxiosInstance;
  private readonly limiter: Bottleneck;
  private authState: AuthState;
  private authPromise: Promise<void> | null = null;

  // Token expiry buffer - refresh 5 minutes before actual expiry
  private readonly TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;
  private readonly TOKEN_LIFETIME_MS = 30 * 60 * 1000; // 30 minutes

  constructor(config: KalshiClientConfig) {
    this.config = {
      rateLimit: 10, // default 10 requests per second
      ...config,
    };

    this.authState = {
      token: null,
      memberId: null,
      expiresAt: null,
    };

    // Create HTTP client
    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    // Add request interceptor for authentication
    this.httpClient.interceptors.request.use(
      async (config) => {
        await this.ensureAuthenticated();
        if (this.authState.token) {
          config.headers.Authorization = `Bearer ${this.authState.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // If unauthorized, try to re-authenticate once
        if (error.response?.status === 401) {
          logger.warn('Received 401, attempting re-authentication');
          this.authState.token = null;
          this.authState.expiresAt = null;

          // Retry the request once
          const config = error.config;
          if (config && !config.headers['X-Retry-Count']) {
            config.headers['X-Retry-Count'] = '1';
            await this.ensureAuthenticated();
            if (this.authState.token) {
              config.headers.Authorization = `Bearer ${this.authState.token}`;
            }
            return this.httpClient.request(config);
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );

    // Set up rate limiter
    this.limiter = new Bottleneck({
      reservoir: this.config.rateLimit,
      reservoirRefreshAmount: this.config.rateLimit,
      reservoirRefreshInterval: 1000, // per second
      maxConcurrent: 5,
      minTime: 1000 / (this.config.rateLimit || 10),
    });

    logger.info('KalshiClient initialized', {
      baseUrl: this.config.baseUrl,
      rateLimit: this.config.rateLimit,
    });
  }

  /**
   * Ensure we have a valid authentication token
   */
  private async ensureAuthenticated(): Promise<void> {
    // If already authenticating, wait for that to complete
    if (this.authPromise) {
      return this.authPromise;
    }

    // Check if current token is still valid
    if (this.isTokenValid()) {
      return;
    }

    // Authenticate
    this.authPromise = this.authenticate()
      .finally(() => {
        this.authPromise = null;
      });

    return this.authPromise;
  }

  /**
   * Check if current token is valid
   */
  private isTokenValid(): boolean {
    if (!this.authState.token || !this.authState.expiresAt) {
      return false;
    }

    const now = Date.now();
    const expiryWithBuffer = this.authState.expiresAt.getTime() - this.TOKEN_EXPIRY_BUFFER_MS;

    return now < expiryWithBuffer;
  }

  /**
   * Authenticate with Kalshi API
   *
   * @throws Error if authentication fails
   */
  public async authenticate(): Promise<void> {
    try {
      logger.info('Authenticating with Kalshi API');

      const response = await axios.post<Kalshi.LoginResponse>(
        `${this.config.baseUrl}/login`,
        {
          email: this.config.email,
          password: this.config.password,
        } as Kalshi.LoginRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      this.authState = {
        token: response.data.token,
        memberId: response.data.member_id,
        expiresAt: new Date(Date.now() + this.TOKEN_LIFETIME_MS),
      };

      logger.info('Successfully authenticated with Kalshi', {
        memberId: this.authState.memberId,
        expiresAt: this.authState.expiresAt,
      });
    } catch (error) {
      logger.error('Failed to authenticate with Kalshi', { error });
      throw new Error(`Kalshi authentication failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get all markets with optional filters
   *
   * @param params - Query parameters for filtering markets
   * @returns Array of markets
   */
  public async getMarkets(params?: Kalshi.GetMarketsParams): Promise<Market[]> {
    return this.limiter.schedule(async () => {
      try {
        logger.debug('Fetching markets from Kalshi', { params });

        const response = await this.httpClient.get<Kalshi.MarketResponse>('/markets', {
          params: {
            limit: 1000,
            status: 'open',
            ...params,
          },
        });

        const markets = response.data.markets.map(m => this.normalizeMarket(m));

        logger.info(`Fetched ${markets.length} markets from Kalshi`);
        return markets;
      } catch (error) {
        logger.error('Failed to fetch markets from Kalshi', { error, params });
        throw error;
      }
    });
  }

  /**
   * Get a single market by ticker
   *
   * @param ticker - Market ticker (e.g., "PRES-2024-DEM")
   * @returns Market data
   */
  public async getMarket(ticker: string): Promise<Market> {
    return this.limiter.schedule(async () => {
      try {
        logger.debug('Fetching market from Kalshi', { ticker });

        const response = await this.httpClient.get<{ market: Kalshi.KalshiMarket }>(
          `/markets/${ticker}`
        );

        const market = this.normalizeMarket(response.data.market);

        logger.debug('Successfully fetched market', { ticker, market });
        return market;
      } catch (error) {
        logger.error('Failed to fetch market from Kalshi', { error, ticker });
        throw error;
      }
    });
  }

  /**
   * Get markets by ticker pattern
   *
   * @param ticker - Ticker pattern to search for
   * @returns Array of matching markets
   */
  public async getTicker(ticker: string): Promise<Market[]> {
    return this.getMarkets({ ticker });
  }

  /**
   * Get market by event ticker
   *
   * @param eventTicker - Event ticker
   * @returns Array of markets for the event
   */
  public async getEventMarkets(eventTicker: string): Promise<Market[]> {
    return this.getMarkets({ event_ticker: eventTicker });
  }

  /**
   * Normalize Kalshi market data to our unified Market interface
   */
  private normalizeMarket(kalshiMarket: Kalshi.KalshiMarket): Market {
    // Calculate mid prices from bid/ask
    const yesPrice = (kalshiMarket.yes_bid + kalshiMarket.yes_ask) / 2 / 100; // Convert cents to decimal
    const noPrice = (kalshiMarket.no_bid + kalshiMarket.no_ask) / 2 / 100;

    return {
      id: kalshiMarket.ticker,
      platform: 'kalshi' as Platform,
      title: kalshiMarket.title,
      description: kalshiMarket.subtitle || kalshiMarket.title,
      question: kalshiMarket.title,

      // Pricing
      yesPrice,
      noPrice,

      // Market details
      volume: kalshiMarket.volume,
      openInterest: kalshiMarket.open_interest,
      liquidity: kalshiMarket.liquidity,

      // Dates
      openDate: new Date(kalshiMarket.open_time),
      closeDate: new Date(kalshiMarket.close_time),
      expirationDate: new Date(kalshiMarket.expiration_time),

      // Status
      status: this.normalizeStatus(kalshiMarket.status),
      resolutionCriteria: kalshiMarket.rules_primary,
      category: kalshiMarket.category,

      // Metadata
      ticker: kalshiMarket.ticker,
      externalUrl: `https://kalshi.com/markets/${kalshiMarket.ticker}`,
      rawData: kalshiMarket,
    };
  }

  /**
   * Normalize Kalshi market status to our unified status
   */
  private normalizeStatus(kalshiStatus: string): Market['status'] {
    const statusMap: Record<string, Market['status']> = {
      'active': 'open',
      'open': 'open',
      'closed': 'closed',
      'finalized': 'finalized',
      'settled': 'settled',
    };

    return statusMap[kalshiStatus.toLowerCase()] || 'closed';
  }

  /**
   * Handle and normalize errors
   */
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        // Server responded with error
        const status = axiosError.response.status;
        const data = axiosError.response.data as any;

        return new Error(
          `Kalshi API error (${status}): ${data?.message || data?.error || axiosError.message}`
        );
      } else if (axiosError.request) {
        // Request made but no response
        return new Error('Kalshi API request failed: No response received');
      }
    }

    return error instanceof Error ? error : new Error(String(error));
  }

  /**
   * Get error message from various error types
   */
  private getErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      return error.response?.data?.message || error.message;
    }
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Get current authentication state (for debugging)
   */
  public getAuthState(): Readonly<AuthState> {
    return { ...this.authState };
  }

  /**
   * Manually refresh authentication token
   */
  public async refreshAuth(): Promise<void> {
    this.authState.token = null;
    this.authState.expiresAt = null;
    return this.authenticate();
  }

  /**
   * Health check - verify API connectivity and authentication
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.ensureAuthenticated();
      // Try to fetch a small number of markets
      await this.getMarkets({ limit: 1 });
      return true;
    } catch (error) {
      logger.error('Kalshi health check failed', { error });
      return false;
    }
  }
}

/**
 * Factory function to create a Kalshi client from environment variables
 */
export function createKalshiClient(config: KalshiClientConfig): KalshiClient {
  return new KalshiClient(config);
}
