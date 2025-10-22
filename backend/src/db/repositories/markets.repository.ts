/**
 * Markets Repository
 *
 * Data access layer for market-related operations.
 * Handles CRUD operations for markets from Kalshi and Polymarket.
 */

import { Market, Prisma } from '@prisma/client';
import { prisma } from '../client';

export interface CreateMarketInput {
  platform: string;
  marketId: string;
  title: string;
  description?: string;
  yesPrice: number;
  noPrice: number;
  volume?: number;
  closeDate?: Date;
  resolutionCriteria?: string;
}

export interface UpdateMarketPricesInput {
  yesPrice: number;
  noPrice: number;
  volume?: number;
}

export class MarketsRepository {
  /**
   * Create a new market or update if already exists
   */
  async upsertMarket(data: CreateMarketInput): Promise<Market> {
    return prisma.market.upsert({
      where: {
        platform_market_unique: {
          platform: data.platform,
          marketId: data.marketId,
        },
      },
      update: {
        title: data.title,
        description: data.description,
        yesPrice: data.yesPrice,
        noPrice: data.noPrice,
        volume: data.volume || 0,
        closeDate: data.closeDate,
        resolutionCriteria: data.resolutionCriteria,
        lastUpdated: new Date(),
      },
      create: data,
    });
  }

  /**
   * Bulk upsert markets (efficient for batch operations)
   */
  async upsertMarkets(markets: CreateMarketInput[]): Promise<void> {
    await prisma.$transaction(
      markets.map((market) =>
        prisma.market.upsert({
          where: {
            platform_market_unique: {
              platform: market.platform,
              marketId: market.marketId,
            },
          },
          update: {
            yesPrice: market.yesPrice,
            noPrice: market.noPrice,
            volume: market.volume || 0,
            lastUpdated: new Date(),
          },
          create: market,
        })
      )
    );
  }

  /**
   * Get market by platform and market ID
   */
  async getMarket(platform: string, marketId: string): Promise<Market | null> {
    return prisma.market.findUnique({
      where: {
        platform_market_unique: {
          platform,
          marketId,
        },
      },
    });
  }

  /**
   * Get market by internal ID
   */
  async getMarketById(id: string): Promise<Market | null> {
    return prisma.market.findUnique({
      where: { id },
    });
  }

  /**
   * Get all active markets for a platform
   */
  async getMarketsByPlatform(
    platform: string,
    limit = 100
  ): Promise<Market[]> {
    return prisma.market.findMany({
      where: {
        platform,
        closeDate: {
          gte: new Date(),
        },
      },
      orderBy: {
        volume: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Search markets by title
   */
  async searchMarkets(query: string, limit = 20): Promise<Market[]> {
    return prisma.market.findMany({
      where: {
        title: {
          contains: query,
          mode: 'insensitive',
        },
        closeDate: {
          gte: new Date(),
        },
      },
      orderBy: {
        volume: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Update market prices
   */
  async updatePrices(
    id: string,
    prices: UpdateMarketPricesInput
  ): Promise<Market> {
    return prisma.market.update({
      where: { id },
      data: {
        ...prices,
        lastUpdated: new Date(),
      },
    });
  }

  /**
   * Delete old/expired markets (cleanup)
   */
  async deleteExpiredMarkets(daysOld = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.market.deleteMany({
      where: {
        closeDate: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  /**
   * Get markets that need price updates (stale data)
   */
  async getStaleMarkets(minutesOld = 5): Promise<Market[]> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - minutesOld);

    return prisma.market.findMany({
      where: {
        lastUpdated: {
          lt: cutoffTime,
        },
        closeDate: {
          gte: new Date(),
        },
      },
      orderBy: {
        lastUpdated: 'asc',
      },
      take: 50,
    });
  }
}

// Export singleton instance
export const marketsRepository = new MarketsRepository();
