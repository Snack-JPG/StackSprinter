/**
 * Polymarket Client Usage Examples
 *
 * This file demonstrates various use cases for the PolymarketClient
 */

import { PolymarketClient } from './polymarket';
import type { PolymarketMarket } from './polymarket';
import type { Market } from '../types';

/**
 * Example 1: Basic Market Fetching
 */
export async function example1_fetchMarkets() {
  console.log('Example 1: Fetching Markets\n');

  const client = new PolymarketClient();

  // Get top 5 active markets
  const markets = await client.getMarkets({
    limit: 5,
    active: true,
    order: 'volume'
  });

  console.log(`Found ${markets.length} markets:`);
  markets.forEach((market, i) => {
    console.log(`${i + 1}. ${market.question}`);
    console.log(`   Volume: $${market.volume}`);
    console.log(`   Outcomes: ${market.outcomes}\n`);
  });
}

/**
 * Example 2: Getting Market Prices
 */
export async function example2_getMarketPrices() {
  console.log('Example 2: Getting Market Prices\n');

  const client = new PolymarketClient();

  // Get markets
  const markets = await client.getMarkets({ limit: 1, active: true });

  if (markets.length > 0) {
    const market = markets[0];
    console.log(`Market: ${market.question}`);

    // Get current prices
    const { yesPrice, noPrice } = await client.getMarketPrices(market.conditionId);

    console.log(`Yes Price: ${(yesPrice * 100).toFixed(2)}%`);
    console.log(`No Price: ${(noPrice * 100).toFixed(2)}%`);
    console.log(`Implied Probability: ${(yesPrice * 100).toFixed(2)}%\n`);
  }
}

/**
 * Example 3: Searching for Markets
 */
export async function example3_searchMarkets() {
  console.log('Example 3: Searching Markets\n');

  const client = new PolymarketClient();

  const searchTerms = ['election', 'bitcoin', 'AI'];

  for (const term of searchTerms) {
    console.log(`Searching for "${term}"...`);
    const results = await client.searchMarkets(term, 3);

    console.log(`Found ${results.length} results:`);
    results.forEach((market, i) => {
      console.log(`  ${i + 1}. ${market.question}`);
    });
    console.log('');
  }
}

/**
 * Example 4: Market Normalization
 */
export async function example4_normalizeMarket() {
  console.log('Example 4: Market Normalization\n');

  const client = new PolymarketClient();

  // Get a market
  const markets = await client.getMarkets({ limit: 1, active: true });

  if (markets.length > 0) {
    const polyMarket = markets[0];

    console.log('Polymarket format:');
    console.log({
      conditionId: polyMarket.conditionId,
      question: polyMarket.question,
      outcomes: polyMarket.outcomes,
      outcomePrices: polyMarket.outcomePrices,
    });

    // Normalize to common format
    const normalized: Market = client.normalizeMarket(polyMarket);

    console.log('\nNormalized format:');
    console.log({
      id: normalized.id,
      platform: normalized.platform,
      question: normalized.question,
      outcomes: normalized.outcomes,
      prices: normalized.prices,
      volume: normalized.volume,
      active: normalized.active,
    });
  }
}

/**
 * Example 5: Monitoring Multiple Markets
 */
export async function example5_monitorMarkets() {
  console.log('Example 5: Monitoring Multiple Markets\n');

  const client = new PolymarketClient();

  // Get top markets
  const markets = await client.getMarkets({
    limit: 3,
    active: true,
    order: 'volume'
  });

  console.log('Starting price monitoring (Ctrl+C to stop)...\n');

  // Monitor prices every 10 seconds
  const interval = setInterval(async () => {
    console.log(`[${new Date().toLocaleTimeString()}] Price Update:`);

    for (const market of markets) {
      try {
        const { yesPrice, noPrice } = await client.getMarketPrices(market.conditionId);
        console.log(`  ${market.question.substring(0, 50)}...`);
        console.log(`    Yes: ${(yesPrice * 100).toFixed(2)}% | No: ${(noPrice * 100).toFixed(2)}%`);
      } catch (error) {
        console.log(`    Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('');
  }, 10000);

  // Stop after 1 minute
  setTimeout(() => {
    clearInterval(interval);
    console.log('Monitoring stopped.');
  }, 60000);
}

/**
 * Example 6: Finding High Volume Markets
 */
export async function example6_highVolumeMarkets() {
  console.log('Example 6: High Volume Markets\n');

  const client = new PolymarketClient();

  // Get markets sorted by volume
  const markets = await client.getMarkets({
    limit: 10,
    active: true,
    order: 'volume'
  });

  console.log('Top 10 Markets by Volume:\n');

  markets.forEach((market, i) => {
    const normalized = client.normalizeMarket(market);
    console.log(`${i + 1}. ${normalized.question}`);
    console.log(`   Volume: $${normalized.volume.toLocaleString()}`);
    console.log(`   Liquidity: $${normalized.liquidity?.toLocaleString() || 'N/A'}`);
    console.log(`   Current Price: ${(normalized.prices[0] * 100).toFixed(2)}%\n`);
  });
}

/**
 * Example 7: Cache Performance
 */
export async function example7_cachePerformance() {
  console.log('Example 7: Cache Performance\n');

  const client = new PolymarketClient();

  // First request (not cached)
  console.log('First request (not cached)...');
  const start1 = Date.now();
  await client.getMarkets({ limit: 10, active: true });
  const time1 = Date.now() - start1;
  console.log(`Time: ${time1}ms\n`);

  // Second request (cached)
  console.log('Second request (cached)...');
  const start2 = Date.now();
  await client.getMarkets({ limit: 10, active: true });
  const time2 = Date.now() - start2;
  console.log(`Time: ${time2}ms\n`);

  console.log(`Speed improvement: ${((time1 - time2) / time1 * 100).toFixed(2)}%`);

  // Cache stats
  const stats = client.getCacheStats();
  console.log(`\nCache contains ${stats.size} entries:`);
  stats.keys.forEach(key => console.log(`  - ${key}`));
}

/**
 * Example 8: Error Handling
 */
export async function example8_errorHandling() {
  console.log('Example 8: Error Handling\n');

  const client = new PolymarketClient();

  // Try to get a non-existent market
  try {
    console.log('Attempting to fetch invalid market...');
    await client.getMarket('0xinvalid');
  } catch (error) {
    console.log(`Caught error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Search with empty query
  console.log('\nSearching with empty query...');
  const results = await client.searchMarkets('');
  console.log(`Results: ${results.length} (should be 0)\n`);
}

/**
 * Example 9: Comparing Market Prices Over Time
 */
export async function example9_priceTracking() {
  console.log('Example 9: Price Tracking\n');

  const client = new PolymarketClient();

  // Get a market
  const markets = await client.getMarkets({ limit: 1, active: true });

  if (markets.length > 0) {
    const market = markets[0];
    console.log(`Tracking: ${market.question}\n`);

    const priceHistory: Array<{ time: string; yesPrice: number }> = [];

    // Sample prices 5 times
    for (let i = 0; i < 5; i++) {
      const { yesPrice } = await client.getMarketPrices(market.conditionId);
      const time = new Date().toLocaleTimeString();

      priceHistory.push({ time, yesPrice });
      console.log(`[${time}] Yes Price: ${(yesPrice * 100).toFixed(2)}%`);

      // Wait 5 seconds between samples
      if (i < 4) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log('\nPrice History:');
    priceHistory.forEach(({ time, yesPrice }) => {
      console.log(`${time}: ${(yesPrice * 100).toFixed(2)}%`);
    });
  }
}

/**
 * Example 10: Events with Multiple Markets
 */
export async function example10_events() {
  console.log('Example 10: Events with Multiple Markets\n');

  const client = new PolymarketClient();

  try {
    // Get events
    const events = await client.getEvents({ limit: 5 });

    console.log(`Found ${events.length} events:\n`);

    events.forEach((event, i) => {
      console.log(`${i + 1}. ${event.title}`);
      console.log(`   Markets: ${event.markets?.length || 0}`);
      console.log(`   Slug: ${event.slug}\n`);
    });
  } catch (error) {
    console.log(`Error fetching events: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  const examples = [
    example1_fetchMarkets,
    example2_getMarketPrices,
    example3_searchMarkets,
    example4_normalizeMarket,
    example6_highVolumeMarkets,
    example7_cachePerformance,
    example8_errorHandling,
  ];

  for (const example of examples) {
    try {
      await example();
      console.log('---\n');
    } catch (error) {
      console.error(`Example failed: ${error}`);
    }
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
