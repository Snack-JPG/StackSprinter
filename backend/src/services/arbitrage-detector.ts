/**
 * Arbitrage Detection Service
 *
 * Analyzes matched market pairs to identify profitable arbitrage opportunities.
 * Calculates profit margins, risk scores, and notifies via WebSocket.
 *
 * TODO: Implement market matching algorithm (fuzzy string matching, NLP)
 * TODO: Implement WebSocket notifications for new opportunities
 * TODO: Add historical tracking of opportunities
 */

import { Market, ArbitrageOpportunity, MatchedMarketPair } from '../clients/types';
import { marketFetcherService } from './market-fetcher';
import { cacheService } from './cache';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export interface DetectorOptions {
  minProfitPercent?: number;
  maxRiskLevel?: 'low' | 'medium' | 'high';
}

export class ArbitrageDetectorService {
  private opportunities: Map<string, ArbitrageOpportunity> = new Map();
  private detectionInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor() {
    logger.info('ArbitrageDetectorService initialized');
  }

  /**
   * Start periodic arbitrage detection
   */
  public start(): void {
    if (this.isRunning) {
      logger.warn('ArbitrageDetectorService already running');
      return;
    }

    logger.info('Starting ArbitrageDetectorService', {
      interval: env.MARKET_FETCH_INTERVAL_MS,
      minProfit: env.ARBITRAGE_MIN_PROFIT_PERCENT,
    });

    this.isRunning = true;

    // Detect immediately on start
    this.detectOpportunities().catch((error) => {
      logger.error('Initial arbitrage detection failed', { error });
    });

    // Set up interval (use same interval as market fetcher)
    this.detectionInterval = setInterval(() => {
      this.detectOpportunities().catch((error) => {
        logger.error('Periodic arbitrage detection failed', { error });
      });
    }, env.MARKET_FETCH_INTERVAL_MS);
  }

  /**
   * Stop periodic arbitrage detection
   */
  public stop(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    this.isRunning = false;
    logger.info('ArbitrageDetectorService stopped');
  }

  /**
   * Main detection logic - find arbitrage opportunities
   */
  private async detectOpportunities(): Promise<void> {
    try {
      logger.info('Starting arbitrage detection cycle');

      // Fetch markets from both platforms
      const [kalshiMarkets, polymarketMarkets] = await Promise.all([
        marketFetcherService.getMarkets({ platform: 'kalshi', useCache: true }),
        marketFetcherService.getMarkets({ platform: 'polymarket', useCache: true }),
      ]);

      logger.debug('Markets fetched for arbitrage detection', {
        kalshi: kalshiMarkets.length,
        polymarket: polymarketMarkets.length,
      });

      // TODO: Implement market matching
      // For now, we'll use a placeholder that requires exact title match
      const matchedPairs = this.findMatchedPairs(kalshiMarkets, polymarketMarkets);

      logger.info(`Found ${matchedPairs.length} matched market pairs`);

      // Analyze each matched pair for arbitrage
      const opportunities: ArbitrageOpportunity[] = [];

      for (const pair of matchedPairs) {
        const opportunity = this.analyzeMarketPair(
          pair.kalshiMarket,
          pair.polymarketMarket
        );

        if (opportunity && opportunity.profitPercent >= env.ARBITRAGE_MIN_PROFIT_PERCENT) {
          opportunities.push(opportunity);
          this.opportunities.set(opportunity.id, opportunity);
        }
      }

      logger.info(`Detected ${opportunities.length} arbitrage opportunities`);

      // Cache opportunities
      if (opportunities.length > 0) {
        await cacheService.cacheOpportunities(opportunities as any);

        // TODO: Emit WebSocket event for new opportunities
        // io.to('arbitrage').emit('new_opportunities', opportunities);
      }
    } catch (error) {
      logger.error('Failed to detect opportunities', { error });
    }
  }

  /**
   * Find matched market pairs between platforms
   *
   * TODO: Implement sophisticated matching algorithm:
   * - Fuzzy string matching (Levenshtein distance)
   * - NLP-based semantic similarity
   * - Historical matching data
   * - Manual curation support
   */
  private findMatchedPairs(
    kalshiMarkets: Market[],
    polymarketMarkets: Market[]
  ): MatchedMarketPair[] {
    const pairs: MatchedMarketPair[] = [];

    // Simple exact title matching (placeholder)
    for (const kalshiMarket of kalshiMarkets) {
      const normalizedKalshiTitle = this.normalizeTitle(kalshiMarket.title);

      for (const polymarketMarket of polymarketMarkets) {
        const normalizedPolymarketTitle = this.normalizeTitle(polymarketMarket.title);

        // Check for title similarity
        const similarity = this.calculateTitleSimilarity(
          normalizedKalshiTitle,
          normalizedPolymarketTitle
        );

        if (similarity > 0.8) {
          // 80% similarity threshold
          pairs.push({
            id: `${kalshiMarket.id}-${polymarketMarket.id}`,
            kalshiMarket,
            polymarketMarket,
            titleSimilarity: similarity,
            descriptionSimilarity: 0, // TODO: Implement
            matchScore: similarity,
            isActive: true,
            lastChecked: new Date(),
          });
        }
      }
    }

    return pairs;
  }

  /**
   * Normalize market title for comparison
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate simple title similarity (placeholder)
   *
   * TODO: Implement proper string similarity algorithm:
   * - Levenshtein distance
   * - Jaccard similarity
   * - Cosine similarity with word embeddings
   */
  private calculateTitleSimilarity(title1: string, title2: string): number {
    // Exact match
    if (title1 === title2) return 1.0;

    // Check if one contains the other
    if (title1.includes(title2) || title2.includes(title1)) {
      return 0.85;
    }

    // Simple word overlap
    const words1 = new Set(title1.split(' '));
    const words2 = new Set(title2.split(' '));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Analyze a market pair for arbitrage opportunity
   */
  private analyzeMarketPair(
    marketA: Market,
    marketB: Market
  ): ArbitrageOpportunity | null {
    try {
      // Strategy 1: Buy YES on one platform, sell YES on another
      const strategy1 = this.calculateArbitrage(
        marketA,
        marketB,
        'yes',
        'yes'
      );

      // Strategy 2: Buy NO on one platform, sell NO on another
      const strategy2 = this.calculateArbitrage(
        marketA,
        marketB,
        'no',
        'no'
      );

      // Return the better opportunity
      if (!strategy1 && !strategy2) return null;
      if (!strategy1) return strategy2;
      if (!strategy2) return strategy1;

      return strategy1.profitPercent > strategy2.profitPercent
        ? strategy1
        : strategy2;
    } catch (error) {
      logger.error('Failed to analyze market pair', {
        error,
        marketA: marketA.id,
        marketB: marketB.id,
      });
      return null;
    }
  }

  /**
   * Calculate arbitrage opportunity for a specific strategy
   */
  private calculateArbitrage(
    marketA: Market,
    marketB: Market,
    sideA: 'yes' | 'no',
    sideB: 'yes' | 'no'
  ): ArbitrageOpportunity | null {
    const priceA = sideA === 'yes' ? marketA.yesPrice : marketA.noPrice;
    const priceB = sideB === 'yes' ? marketB.yesPrice : marketB.noPrice;

    // Determine buy and sell markets
    let buyMarket: Market, sellMarket: Market, buyPrice: number, sellPrice: number;

    if (priceA < priceB) {
      buyMarket = marketA;
      sellMarket = marketB;
      buyPrice = priceA;
      sellPrice = priceB;
    } else {
      buyMarket = marketB;
      sellMarket = marketA;
      buyPrice = priceB;
      sellPrice = priceA;
    }

    // Calculate profit
    const costPer100 = buyPrice * 100;
    const revenuePer100 = sellPrice * 100;
    const profitPer100 = revenuePer100 - costPer100;
    const profitPercent = (profitPer100 / costPer100) * 100;

    // Must be profitable
    if (profitPercent <= 0) return null;

    // Calculate risk score
    const riskScore = this.calculateRiskScore(buyMarket, sellMarket);
    const riskLevel = this.getRiskLevel(riskScore);

    // Calculate volume ratio
    const volumeRatio = Math.min(buyMarket.volume, sellMarket.volume) /
      Math.max(buyMarket.volume, sellMarket.volume);

    return {
      id: `arb-${buyMarket.id}-${sellMarket.id}-${Date.now()}`,
      detectedAt: new Date(),
      marketA: buyMarket,
      marketB: sellMarket,
      strategy: buyMarket.platform === 'kalshi' ? 'long-short' : 'short-long',
      profitPercent,
      profitAbsolute: profitPer100,
      buyMarket: buyMarket.platform,
      buyPrice,
      sellMarket: sellMarket.platform,
      sellPrice,
      volumeRatio,
      liquidityScore: this.calculateLiquidityScore(buyMarket, sellMarket),
      riskLevel,
    };
  }

  /**
   * Calculate risk score (0-100, higher = riskier)
   */
  private calculateRiskScore(marketA: Market, marketB: Market): number {
    let score = 0;

    // Volume risk
    const avgVolume = (marketA.volume + marketB.volume) / 2;
    if (avgVolume < 1000) score += 30;
    else if (avgVolume < 10000) score += 20;
    else if (avgVolume < 50000) score += 10;

    // Time to close risk
    const minTimeToClose = Math.min(
      marketA.closeDate.getTime() - Date.now(),
      marketB.closeDate.getTime() - Date.now()
    );

    const hoursToClose = minTimeToClose / (1000 * 60 * 60);
    if (hoursToClose < 1) score += 40;
    else if (hoursToClose < 24) score += 20;
    else if (hoursToClose < 168) score += 10; // 1 week

    // Price volatility (based on spread from 50%)
    const avgPrice = (marketA.yesPrice + marketB.yesPrice) / 2;
    const distanceFrom50 = Math.abs(avgPrice - 0.5);
    if (distanceFrom50 > 0.4) score += 20;
    else if (distanceFrom50 > 0.3) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score < 30) return 'low';
    if (score < 60) return 'medium';
    return 'high';
  }

  /**
   * Calculate liquidity score (0-100, higher = better)
   */
  private calculateLiquidityScore(marketA: Market, marketB: Market): number {
    const avgVolume = (marketA.volume + marketB.volume) / 2;
    const avgOpenInterest = ((marketA.openInterest || 0) + (marketB.openInterest || 0)) / 2;

    let score = 0;

    // Volume score
    if (avgVolume > 100000) score += 50;
    else if (avgVolume > 50000) score += 40;
    else if (avgVolume > 10000) score += 30;
    else if (avgVolume > 1000) score += 20;
    else score += 10;

    // Open interest score
    if (avgOpenInterest > 50000) score += 50;
    else if (avgOpenInterest > 10000) score += 40;
    else if (avgOpenInterest > 1000) score += 30;
    else score += 20;

    return Math.min(score, 100);
  }

  /**
   * Get current opportunities
   */
  public async getOpportunities(options: DetectorOptions = {}): Promise<ArbitrageOpportunity[]> {
    const { minProfitPercent = 0, maxRiskLevel = 'high' } = options;

    // Try cache first
    const cachedOpportunities = await cacheService.getOpportunities();
    let opportunities = cachedOpportunities
      ? (cachedOpportunities as any as ArbitrageOpportunity[])
      : Array.from(this.opportunities.values());

    // Filter by criteria
    opportunities = opportunities.filter((opp) => {
      if (opp.profitPercent < minProfitPercent) return false;

      if (maxRiskLevel === 'low' && opp.riskLevel !== 'low') return false;
      if (maxRiskLevel === 'medium' && opp.riskLevel === 'high') return false;

      return true;
    });

    // Sort by profit descending
    opportunities.sort((a, b) => b.profitPercent - a.profitPercent);

    return opportunities;
  }

  /**
   * Get a specific opportunity by ID
   */
  public async getOpportunity(id: string): Promise<ArbitrageOpportunity | null> {
    return this.opportunities.get(id) || null;
  }

  /**
   * Get statistics
   */
  public getStats() {
    const opportunities = Array.from(this.opportunities.values());

    return {
      totalOpportunities: opportunities.length,
      averageProfit: opportunities.reduce((sum, opp) => sum + opp.profitPercent, 0) / opportunities.length || 0,
      maxProfit: Math.max(...opportunities.map((opp) => opp.profitPercent), 0),
      riskDistribution: {
        low: opportunities.filter((opp) => opp.riskLevel === 'low').length,
        medium: opportunities.filter((opp) => opp.riskLevel === 'medium').length,
        high: opportunities.filter((opp) => opp.riskLevel === 'high').length,
      },
    };
  }
}

// Export singleton instance
export const arbitrageDetectorService = new ArbitrageDetectorService();
