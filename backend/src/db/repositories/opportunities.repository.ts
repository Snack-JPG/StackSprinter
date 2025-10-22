/**
 * Opportunities Repository
 *
 * Data access layer for arbitrage opportunities.
 * Handles CRUD operations for detected price discrepancies.
 */

import { Opportunity, Prisma } from '@prisma/client';
import { prisma } from '../client';

export interface CreateOpportunityInput {
  matchedPairId: string;
  kalshiPrice: number;
  polymarketPrice: number;
  spread: number;
  netProfit: number;
  riskScore: number;
}

export interface OpportunityWithMarkets extends Opportunity {
  matchedPair: {
    id: string;
    confidence: number;
    kalshiMarket: {
      id: string;
      platform: string;
      marketId: string;
      title: string;
      volume: number;
    };
    polymarketMarket: {
      id: string;
      platform: string;
      marketId: string;
      title: string;
      volume: number;
    };
  };
}

export class OpportunitiesRepository {
  /**
   * Create a new opportunity
   */
  async createOpportunity(data: CreateOpportunityInput): Promise<Opportunity> {
    return prisma.opportunity.create({
      data,
    });
  }

  /**
   * Bulk create opportunities (efficient for batch operations)
   */
  async createOpportunities(
    opportunities: CreateOpportunityInput[]
  ): Promise<void> {
    await prisma.opportunity.createMany({
      data: opportunities,
      skipDuplicates: true,
    });
  }

  /**
   * Get opportunity by ID with full market details
   */
  async getOpportunityById(
    id: string
  ): Promise<OpportunityWithMarkets | null> {
    return prisma.opportunity.findUnique({
      where: { id },
      include: {
        matchedPair: {
          include: {
            kalshiMarket: {
              select: {
                id: true,
                platform: true,
                marketId: true,
                title: true,
                volume: true,
              },
            },
            polymarketMarket: {
              select: {
                id: true,
                platform: true,
                marketId: true,
                title: true,
                volume: true,
              },
            },
          },
        },
      },
    }) as Promise<OpportunityWithMarkets | null>;
  }

  /**
   * Get recent opportunities above profit threshold
   */
  async getProfitableOpportunities(
    minProfit = 1.0,
    hoursAgo = 1,
    limit = 50
  ): Promise<OpportunityWithMarkets[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursAgo);

    return prisma.opportunity.findMany({
      where: {
        netProfit: {
          gte: minProfit,
        },
        detectedAt: {
          gte: cutoffTime,
        },
      },
      include: {
        matchedPair: {
          include: {
            kalshiMarket: {
              select: {
                id: true,
                platform: true,
                marketId: true,
                title: true,
                volume: true,
              },
            },
            polymarketMarket: {
              select: {
                id: true,
                platform: true,
                marketId: true,
                title: true,
                volume: true,
              },
            },
          },
        },
      },
      orderBy: [
        { netProfit: 'desc' },
        { detectedAt: 'desc' },
      ],
      take: limit,
    }) as Promise<OpportunityWithMarkets[]>;
  }

  /**
   * Get opportunities by matched pair
   */
  async getOpportunitiesByMatch(
    matchedPairId: string,
    limit = 100
  ): Promise<Opportunity[]> {
    return prisma.opportunity.findMany({
      where: {
        matchedPairId,
      },
      orderBy: {
        detectedAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get low-risk high-profit opportunities
   */
  async getLowRiskOpportunities(
    minProfit = 2.0,
    maxRisk = 0.3,
    hoursAgo = 24,
    limit = 20
  ): Promise<OpportunityWithMarkets[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursAgo);

    return prisma.opportunity.findMany({
      where: {
        netProfit: {
          gte: minProfit,
        },
        riskScore: {
          lte: maxRisk,
        },
        detectedAt: {
          gte: cutoffTime,
        },
      },
      include: {
        matchedPair: {
          include: {
            kalshiMarket: {
              select: {
                id: true,
                platform: true,
                marketId: true,
                title: true,
                volume: true,
              },
            },
            polymarketMarket: {
              select: {
                id: true,
                platform: true,
                marketId: true,
                title: true,
                volume: true,
              },
            },
          },
        },
      },
      orderBy: [
        { netProfit: 'desc' },
        { riskScore: 'asc' },
      ],
      take: limit,
    }) as Promise<OpportunityWithMarkets[]>;
  }

  /**
   * Get opportunity statistics for a time period
   */
  async getOpportunityStats(hoursAgo = 24): Promise<{
    total: number;
    avgProfit: number;
    avgRisk: number;
    avgSpread: number;
    maxProfit: number;
  }> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursAgo);

    const stats = await prisma.opportunity.aggregate({
      where: {
        detectedAt: {
          gte: cutoffTime,
        },
      },
      _count: true,
      _avg: {
        netProfit: true,
        riskScore: true,
        spread: true,
      },
      _max: {
        netProfit: true,
      },
    });

    return {
      total: stats._count,
      avgProfit: stats._avg.netProfit || 0,
      avgRisk: stats._avg.riskScore || 0,
      avgSpread: stats._avg.spread || 0,
      maxProfit: stats._max.netProfit || 0,
    };
  }

  /**
   * Get trending opportunities (frequently appearing)
   */
  async getTrendingOpportunities(
    hoursAgo = 24,
    minOccurrences = 3,
    limit = 20
  ): Promise<
    Array<{
      matchedPairId: string;
      count: number;
      avgProfit: number;
      maxProfit: number;
      latestDetection: Date;
    }>
  > {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursAgo);

    const trending = await prisma.opportunity.groupBy({
      by: ['matchedPairId'],
      where: {
        detectedAt: {
          gte: cutoffTime,
        },
      },
      _count: {
        id: true,
      },
      _avg: {
        netProfit: true,
      },
      _max: {
        netProfit: true,
        detectedAt: true,
      },
      having: {
        id: {
          _count: {
            gte: minOccurrences,
          },
        },
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: limit,
    });

    return trending.map((item) => ({
      matchedPairId: item.matchedPairId,
      count: item._count.id,
      avgProfit: item._avg.netProfit || 0,
      maxProfit: item._max.netProfit || 0,
      latestDetection: item._max.detectedAt || new Date(),
    }));
  }

  /**
   * Delete old opportunities (cleanup)
   */
  async deleteOldOpportunities(daysOld = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.opportunity.deleteMany({
      where: {
        detectedAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  /**
   * Get recent opportunities for real-time feed
   */
  async getRecentOpportunities(
    minutesAgo = 5,
    limit = 100
  ): Promise<OpportunityWithMarkets[]> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - minutesAgo);

    return prisma.opportunity.findMany({
      where: {
        detectedAt: {
          gte: cutoffTime,
        },
      },
      include: {
        matchedPair: {
          include: {
            kalshiMarket: {
              select: {
                id: true,
                platform: true,
                marketId: true,
                title: true,
                volume: true,
              },
            },
            polymarketMarket: {
              select: {
                id: true,
                platform: true,
                marketId: true,
                title: true,
                volume: true,
              },
            },
          },
        },
      },
      orderBy: {
        detectedAt: 'desc',
      },
      take: limit,
    }) as Promise<OpportunityWithMarkets[]>;
  }
}

// Export singleton instance
export const opportunitiesRepository = new OpportunitiesRepository();
