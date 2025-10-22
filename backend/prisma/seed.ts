/**
 * Database Seed Script
 *
 * Populates the database with sample data for development and testing.
 * Run with: pnpm run db:seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clear existing data (optional - comment out if you want to preserve data)
  console.log('🗑️  Clearing existing data...');
  await prisma.opportunity.deleteMany();
  await prisma.matchedPair.deleteMany();
  await prisma.market.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.user.deleteMany();
  console.log('✓ Existing data cleared\n');

  // Create sample Kalshi markets
  console.log('📊 Creating Kalshi markets...');
  const kalshiMarkets = await Promise.all([
    prisma.market.create({
      data: {
        platform: 'kalshi',
        marketId: 'KXBTC-24JAN-B50000',
        title: 'Will Bitcoin reach $50,000 by January 2024?',
        description: 'This market resolves to Yes if Bitcoin (BTC) trades at or above $50,000 on any major exchange before January 31, 2024 11:59 PM ET.',
        yesPrice: 0.45,
        noPrice: 0.55,
        volume: 125000,
        closeDate: new Date('2024-01-31T23:59:59Z'),
        resolutionCriteria: 'Resolves Yes if Bitcoin reaches $50,000 on CoinGecko aggregate price.',
      },
    }),
    prisma.market.create({
      data: {
        platform: 'kalshi',
        marketId: 'KXPRES-24NOV-BIDEN',
        title: 'Will Joe Biden win the 2024 Presidential Election?',
        description: 'This market resolves to Yes if Joe Biden wins the 2024 US Presidential Election.',
        yesPrice: 0.38,
        noPrice: 0.62,
        volume: 850000,
        closeDate: new Date('2024-11-05T23:59:59Z'),
        resolutionCriteria: 'Resolves based on official election results.',
      },
    }),
    prisma.market.create({
      data: {
        platform: 'kalshi',
        marketId: 'KXSP500-24FEB-B4800',
        title: 'Will S&P 500 close above 4800 in February 2024?',
        description: 'Resolves Yes if S&P 500 closes above 4800 on the last trading day of February 2024.',
        yesPrice: 0.62,
        noPrice: 0.38,
        volume: 450000,
        closeDate: new Date('2024-02-29T23:59:59Z'),
        resolutionCriteria: 'Based on official S&P 500 closing price.',
      },
    }),
  ]);
  console.log(`✓ Created ${kalshiMarkets.length} Kalshi markets\n`);

  // Create sample Polymarket markets
  console.log('📊 Creating Polymarket markets...');
  const polymarketMarkets = await Promise.all([
    prisma.market.create({
      data: {
        platform: 'polymarket',
        marketId: 'poly-btc-50k-jan24',
        title: 'Bitcoin to hit $50K by end of January 2024?',
        description: 'Will Bitcoin trade at or above $50,000 before February 1, 2024?',
        yesPrice: 0.48,
        noPrice: 0.52,
        volume: 320000,
        closeDate: new Date('2024-01-31T23:59:59Z'),
        resolutionCriteria: 'Resolves Yes if Bitcoin reaches $50K on CoinGecko.',
      },
    }),
    prisma.market.create({
      data: {
        platform: 'polymarket',
        marketId: 'poly-biden-2024-pres',
        title: 'Joe Biden to win 2024 Presidential Election',
        description: 'Will Joe Biden be elected President in the 2024 US election?',
        yesPrice: 0.42,
        noPrice: 0.58,
        volume: 1200000,
        closeDate: new Date('2024-11-05T23:59:59Z'),
        resolutionCriteria: 'Based on certified election results.',
      },
    }),
    prisma.market.create({
      data: {
        platform: 'polymarket',
        marketId: 'poly-sp500-4800-feb24',
        title: 'S&P 500 above 4800 by end of February',
        description: 'Will the S&P 500 close above 4800 on the last trading day of February 2024?',
        yesPrice: 0.65,
        noPrice: 0.35,
        volume: 580000,
        closeDate: new Date('2024-02-29T23:59:59Z'),
        resolutionCriteria: 'Official S&P 500 closing price from NYSE.',
      },
    }),
  ]);
  console.log(`✓ Created ${polymarketMarkets.length} Polymarket markets\n`);

  // Create matched pairs
  console.log('🔗 Creating matched pairs...');
  const matchedPairs = await Promise.all([
    prisma.matchedPair.create({
      data: {
        kalshiMarketId: kalshiMarkets[0].id,
        polymarketMarketId: polymarketMarkets[0].id,
        confidence: 0.95,
        status: 'active',
      },
    }),
    prisma.matchedPair.create({
      data: {
        kalshiMarketId: kalshiMarkets[1].id,
        polymarketMarketId: polymarketMarkets[1].id,
        confidence: 0.92,
        status: 'active',
      },
    }),
    prisma.matchedPair.create({
      data: {
        kalshiMarketId: kalshiMarkets[2].id,
        polymarketMarketId: polymarketMarkets[2].id,
        confidence: 0.88,
        status: 'active',
      },
    }),
  ]);
  console.log(`✓ Created ${matchedPairs.length} matched pairs\n`);

  // Create sample opportunities
  console.log('💰 Creating arbitrage opportunities...');
  const opportunities = await Promise.all([
    prisma.opportunity.create({
      data: {
        matchedPairId: matchedPairs[0].id,
        kalshiPrice: 0.45,
        polymarketPrice: 0.48,
        spread: 0.03,
        netProfit: 2.8,
        riskScore: 0.15,
        detectedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      },
    }),
    prisma.opportunity.create({
      data: {
        matchedPairId: matchedPairs[0].id,
        kalshiPrice: 0.46,
        polymarketPrice: 0.49,
        spread: 0.03,
        netProfit: 2.5,
        riskScore: 0.18,
        detectedAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      },
    }),
    prisma.opportunity.create({
      data: {
        matchedPairId: matchedPairs[1].id,
        kalshiPrice: 0.38,
        polymarketPrice: 0.42,
        spread: 0.04,
        netProfit: 3.6,
        riskScore: 0.25,
        detectedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      },
    }),
    prisma.opportunity.create({
      data: {
        matchedPairId: matchedPairs[2].id,
        kalshiPrice: 0.62,
        polymarketPrice: 0.65,
        spread: 0.03,
        netProfit: 2.2,
        riskScore: 0.12,
        detectedAt: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
      },
    }),
  ]);
  console.log(`✓ Created ${opportunities.length} opportunities\n`);

  // Create sample users
  console.log('👤 Creating sample users...');
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'demo@arbitragemarkets.com',
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'trader@example.com',
        emailVerified: true,
      },
    }),
  ]);
  console.log(`✓ Created ${users.length} users\n`);

  // Create sample alerts
  console.log('🔔 Creating sample alerts...');
  const alerts = await Promise.all([
    prisma.alert.create({
      data: {
        userId: users[0].id,
        minProfit: 2.0,
        categories: ['crypto', 'politics'],
        enabled: true,
      },
    }),
    prisma.alert.create({
      data: {
        userId: users[1].id,
        minProfit: 3.5,
        categories: ['sports', 'finance'],
        enabled: true,
      },
    }),
  ]);
  console.log(`✓ Created ${alerts.length} alerts\n`);

  // Summary
  console.log('✅ Database seeded successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - Markets: ${kalshiMarkets.length + polymarketMarkets.length}`);
  console.log(`   - Matched Pairs: ${matchedPairs.length}`);
  console.log(`   - Opportunities: ${opportunities.length}`);
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Alerts: ${alerts.length}`);
  console.log();
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
