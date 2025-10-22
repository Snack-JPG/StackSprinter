/**
 * Repositories Index
 *
 * Centralized export for all repository modules.
 * Provides easy import for data access layers.
 *
 * Usage:
 *   import { marketsRepository, opportunitiesRepository } from './db/repositories';
 */

export { marketsRepository, MarketsRepository } from './markets.repository';
export { matchedPairsRepository, MatchedPairsRepository } from './matched-pairs.repository';
export { opportunitiesRepository, OpportunitiesRepository } from './opportunities.repository';

// Re-export types
export type {
  CreateMarketInput,
  UpdateMarketPricesInput,
} from './markets.repository';

export type {
  CreateMatchedPairInput,
  MatchedPairWithMarkets,
} from './matched-pairs.repository';

export type {
  CreateOpportunityInput,
  OpportunityWithMarkets,
} from './opportunities.repository';
