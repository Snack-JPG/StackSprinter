/**
 * Shared types for market data across different platforms
 */

export type Platform = 'kalshi' | 'polymarket';

export type MarketStatus = 'open' | 'closed' | 'settled' | 'finalized';

/**
 * Unified market interface across platforms
 */
export interface Market {
  id: string;
  platform: Platform;
  title: string;
  description: string;
  question?: string;

  // Pricing (in decimal format, e.g., 0.65 = 65%)
  yesPrice: number;
  noPrice: number;

  // Market details
  volume: number;
  openInterest?: number;
  liquidity?: number;

  // Dates
  openDate?: Date;
  closeDate: Date;
  expirationDate?: Date;

  // Status and metadata
  status: MarketStatus;
  resolutionCriteria?: string;
  category?: string;
  tags?: string[];

  // Platform-specific
  ticker?: string; // Kalshi ticker
  externalUrl?: string;
  rawData?: any; // Original API response
}

/**
 * Arbitrage opportunity between two markets
 */
export interface ArbitrageOpportunity {
  id: string;
  detectedAt: Date;

  // Market pair
  marketA: Market;
  marketB: Market;

  // Opportunity details
  strategy: 'long-short' | 'short-long';
  profitPercent: number;
  profitAbsolute: number;

  // Entry prices
  buyMarket: Platform;
  buyPrice: number;
  sellMarket: Platform;
  sellPrice: number;

  // Risk assessment
  volumeRatio: number;
  liquidityScore: number;
  riskLevel: 'low' | 'medium' | 'high';

  // Metadata
  expiresAt?: Date;
  notes?: string;
}

/**
 * Matched market pair across platforms
 */
export interface MatchedMarketPair {
  id: string;
  kalshiMarket: Market;
  polymarketMarket: Market;

  // Similarity metrics
  titleSimilarity: number;
  descriptionSimilarity: number;
  matchScore: number; // 0-1

  // Status
  isActive: boolean;
  lastChecked: Date;
}

/**
 * Kalshi-specific types
 */
export namespace Kalshi {
  export interface LoginRequest {
    email: string;
    password: string;
  }

  export interface LoginResponse {
    token: string;
    member_id: string;
  }

  export interface MarketResponse {
    markets: KalshiMarket[];
    cursor?: string;
  }

  export interface KalshiMarket {
    ticker: string;
    event_ticker: string;
    market_type: string;
    title: string;
    subtitle?: string;

    // Pricing
    yes_bid: number;
    yes_ask: number;
    no_bid: number;
    no_ask: number;
    last_price: number;

    // Volume and liquidity
    volume: number;
    volume_24h: number;
    open_interest: number;
    liquidity?: number;

    // Dates (ISO strings)
    open_time: string;
    close_time: string;
    expiration_time: string;
    settlement_time?: string;

    // Status
    status: string;
    result?: string;

    // Metadata
    category: string;
    rules_primary?: string;
    rules_secondary?: string;
    can_close_early: boolean;
    floor_strike?: number;
    cap_strike?: number;
    strike_period?: string;

    // Risk
    risk_limit_cents?: number;
    notional_value?: number;
  }

  export interface EventResponse {
    events: KalshiEvent[];
    cursor?: string;
  }

  export interface KalshiEvent {
    event_ticker: string;
    series_ticker: string;
    title: string;
    sub_title?: string;
    category: string;
    markets: KalshiMarket[];
  }

  export interface GetMarketsParams {
    limit?: number;
    cursor?: string;
    status?: string;
    series_ticker?: string;
    event_ticker?: string;
    ticker?: string;
    min_close_ts?: number;
    max_close_ts?: number;
  }
}

/**
 * Polymarket-specific types (TODO: Complete when implementing Polymarket client)
 */
export namespace Polymarket {
  export interface Market {
    // TODO: Define based on Polymarket API documentation
    id: string;
    question: string;
    description?: string;
    outcomes: string[];
    // Add more fields
  }

  export interface GetMarketsParams {
    // TODO: Define query parameters
  }
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

/**
 * Rate limiting types
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

/**
 * Cache entry metadata
 */
export interface CacheEntry<T> {
  data: T;
  cachedAt: Date;
  expiresAt: Date;
  key: string;
}
