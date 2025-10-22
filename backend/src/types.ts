/**
 * Common types for the ArbitrageMarkets platform
 * These types provide a unified interface across different prediction market platforms
 */

/**
 * Unified market interface used across all prediction market platforms
 */
export interface Market {
  /** Unique identifier for the market */
  id: string;

  /** Platform where this market exists (e.g., 'polymarket', 'kalshi', 'manifold') */
  platform: string;

  /** The question being asked in the market */
  question: string;

  /** Market description or additional details */
  description?: string;

  /** URL slug for the market */
  slug?: string;

  /** Array of possible outcomes */
  outcomes: string[];

  /** Current prices for each outcome (0-1 range) */
  prices: number[];

  /** Trading volume in USD */
  volume: number;

  /** Total liquidity in the market */
  liquidity?: number;

  /** Number of traders participating */
  traderCount?: number;

  /** Market creation timestamp */
  createdAt: Date;

  /** Market close/resolution timestamp */
  closesAt?: Date;

  /** Whether the market is currently active */
  active: boolean;

  /** Whether the market is closed for trading */
  closed: boolean;

  /** Whether the market has been resolved */
  resolved: boolean;

  /** Resolution criteria or rules */
  resolutionCriteria?: string;

  /** Market category or tags */
  category?: string;
  tags?: string[];

  /** Platform-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Price update from a market
 */
export interface PriceUpdate {
  marketId: string;
  platform: string;
  outcome: string;
  price: number;
  timestamp: Date;
}

/**
 * Arbitrage opportunity between two markets
 */
export interface ArbitrageOpportunity {
  /** Unique identifier for this opportunity */
  id: string;

  /** First market in the arbitrage */
  market1: Market;

  /** Second market in the arbitrage */
  market2: Market;

  /** Expected profit percentage */
  profitPercentage: number;

  /** Recommended action on market1 */
  action1: 'buy' | 'sell';

  /** Recommended action on market2 */
  action2: 'buy' | 'sell';

  /** Timestamp when opportunity was detected */
  detectedAt: Date;

  /** Whether this opportunity is still valid */
  valid: boolean;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * Market filter parameters
 */
export interface MarketFilter extends PaginationParams {
  active?: boolean;
  closed?: boolean;
  category?: string;
  query?: string;
}
