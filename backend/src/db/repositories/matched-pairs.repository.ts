/**
 * Matched Pairs Repository
 *
 * Data access layer for matched market pairs.
 * Handles operations for markets matched between Kalshi and Polymarket.
 */

import { MatchedPair, Prisma } from '@prisma/client';
import { prisma } from '../client';

export interface CreateMatchedPairInput {
  kalshiMarketId: string;
  polymarketMarketId: string;
  confidence: number;
  status?: string;
}

export interface MatchedPairWithMarkets extends MatchedPair {
  kalshiMarket: {
    id: string;
    platform: string;
    marketId: string;
    title: string;
    yesPrice: number;
    noPrice: number;
    volume: number;
  };
  polymarketMarket: {
    id: string;
    platform: string;
    marketId: string;
    title: string;
    yesPrice: number;
    noPrice: number;
    volume: number;
  };
}

export class MatchedPairsRepository {
  /**
   * Create a new matched pair
   */
  async createMatchedPair(data: CreateMatchedPairInput): Promise<MatchedPair> {
    return prisma.matchedPair.create({
      data: {
        ...data,
        status: data.status || 'active',
      },
    });
  }

  /**
   * Get or create matched pair
   */
  async upsertMatchedPair(data: CreateMatchedPairInput): Promise<MatchedPair> {
    return prisma.matchedPair.upsert({
      where: {
        matched_pair_unique: {
          kalshiMarketId: data.kalshiMarketId,
          polymarketMarketId: data.polymarketMarketId,
        },
      },
      update: {
        confidence: data.confidence,
        status: data.status || 'active',
        updatedAt: new Date(),
      },
      create: {
        ...data,
        status: data.status || 'active',
      },
    });
  }

  /**
   * Get matched pair by ID with market details
   */
  async getMatchedPairById(id: string): Promise<MatchedPairWithMarkets | null> {
    return prisma.matchedPair.findUnique({
      where: { id },
      include: {
        kalshiMarket: {
          select: {
            id: true,
            platform: true,
            marketId: true,
            title: true,
            yesPrice: true,
            noPrice: true,
            volume: true,
          },
        },
        polymarketMarket: {
          select: {
            id: true,
            platform: true,
            marketId: true,
            title: true,
            yesPrice: true,
            noPrice: true,
            volume: true,
          },
        },
      },
    }) as Promise<MatchedPairWithMarkets | null>;
  }

  /**
   * Get all active matched pairs
   */
  async getActiveMatchedPairs(
    limit = 100
  ): Promise<MatchedPairWithMarkets[]> {
    return prisma.matchedPair.findMany({
      where: {
        status: 'active',
      },
      include: {
        kalshiMarket: {
          select: {
            id: true,
            platform: true,
            marketId: true,
            title: true,
            yesPrice: true,
            noPrice: true,
            volume: true,
          },
        },
        polymarketMarket: {
          select: {
            id: true,
            platform: true,
            marketId: true,
            title: true,
            yesPrice: true,
            noPrice: true,
            volume: true,
          },
        },
      },
      orderBy: {
        confidence: 'desc',
      },
      take: limit,
    }) as Promise<MatchedPairWithMarkets[]>;
  }

  /**
   * Get matched pairs by confidence threshold
   */
  async getHighConfidenceMatches(
    minConfidence = 0.8,
    limit = 50
  ): Promise<MatchedPairWithMarkets[]> {
    return prisma.matchedPair.findMany({
      where: {
        confidence: {
          gte: minConfidence,
        },
        status: 'active',
      },
      include: {
        kalshiMarket: {
          select: {
            id: true,
            platform: true,
            marketId: true,
            title: true,
            yesPrice: true,
            noPrice: true,
            volume: true,
          },
        },
        polymarketMarket: {
          select: {
            id: true,
            platform: true,
            marketId: true,
            title: true,
            yesPrice: true,
            noPrice: true,
            volume: true,
          },
        },
      },
      orderBy: [
        { confidence: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    }) as Promise<MatchedPairWithMarkets[]>;
  }

  /**
   * Update matched pair status
   */
  async updateStatus(id: string, status: string): Promise<MatchedPair> {
    return prisma.matchedPair.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update confidence score
   */
  async updateConfidence(id: string, confidence: number): Promise<MatchedPair> {
    return prisma.matchedPair.update({
      where: { id },
      data: {
        confidence,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Archive old matched pairs
   */
  async archiveOldMatches(daysOld = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.matchedPair.updateMany({
      where: {
        updatedAt: {
          lt: cutoffDate,
        },
        status: 'active',
      },
      data: {
        status: 'archived',
        updatedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Delete matched pair
   */
  async deleteMatchedPair(id: string): Promise<void> {
    await prisma.matchedPair.delete({
      where: { id },
    });
  }

  /**
   * Get matched pairs with recent opportunities
   */
  async getMatchesWithOpportunities(
    hoursAgo = 24,
    limit = 50
  ): Promise<MatchedPairWithMarkets[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursAgo);

    return prisma.matchedPair.findMany({
      where: {
        status: 'active',
        opportunities: {
          some: {
            detectedAt: {
              gte: cutoffTime,
            },
          },
        },
      },
      include: {
        kalshiMarket: {
          select: {
            id: true,
            platform: true,
            marketId: true,
            title: true,
            yesPrice: true,
            noPrice: true,
            volume: true,
          },
        },
        polymarketMarket: {
          select: {
            id: true,
            platform: true,
            marketId: true,
            title: true,
            yesPrice: true,
            noPrice: true,
            volume: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
    }) as Promise<MatchedPairWithMarkets[]>;
  }
}

// Export singleton instance
export const matchedPairsRepository = new MatchedPairsRepository();
