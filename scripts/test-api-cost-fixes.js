#!/usr/bin/env node

/**
 * Test script to verify API cost fixes
 * Tests that:
 * 1. No external API calls are made
 * 2. Cache works correctly
 * 3. API usage only increments for non-cached requests
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

const testQueries = [
  'book of dead',
  'gates of olympus',
  'sweet bonanza'
];

async function testSlotsSuggest(query, sessionToken = null) {
  const params = new URLSearchParams({
    q: query,
    limit: '10'
  });
  
  if (sessionToken) {
    params.set('session', sessionToken);
  }
  
  const url = `${BASE_URL}/api/slots-suggest?${params.toString()}`;
  const start = Date.now();
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    const duration = Date.now() - start;
    
    return {
      success: response.ok && data.success,
      results: data.data?.length || 0,
      duration,
      fromCache: data.metadata?.fromCache || false,
      apiUsage: data.metadata?.apiUsage,
      error: data.error
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - start
    };
  }
}

async function testSlotsLaunch(search) {
  const params = new URLSearchParams({
    search: search,
    limit: '10'
  });
  
  const url = `${BASE_URL}/api/slotslaunch?${params.toString()}`;
  const start = Date.now();
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    const duration = Date.now() - start;
    
    return {
      success: response.ok && data.success,
      results: data.games?.length || 0,
      duration,
      error: data.error
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - start
    };
  }
}

async function runTests() {
  console.log('🧪 Testing API Cost Fixes\n');
  console.log('='.repeat(60));
  
  // Test 1: slots-suggest route (should use database)
  console.log('\n📊 Test 1: /api/slots-suggest (should use database)');
  console.log('-'.repeat(60));
  
  for (const query of testQueries) {
    const result = await testSlotsSuggest(query);
    const status = result.success ? '✅' : '❌';
    const cache = result.fromCache ? '(cached)' : '(database)';
    
    console.log(`${status} "${query}": ${result.results} results, ${result.duration}ms ${cache}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Test 2: Cache behavior (second request should be cached)
  console.log('\n📦 Test 2: Cache behavior');
  console.log('-'.repeat(60));
  
  const testQuery = 'book of dead';
  console.log(`Testing cache for: "${testQuery}"`);
  
  const first = await testSlotsSuggest(testQuery);
  console.log(`First request:  ${first.results} results, ${first.duration}ms ${first.fromCache ? '(cached)' : '(database)'}`);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const second = await testSlotsSuggest(testQuery);
  console.log(`Second request: ${second.results} results, ${second.duration}ms ${second.fromCache ? '(cached)' : '(database)'}`);
  
  if (second.fromCache && second.duration < first.duration) {
    console.log('✅ Cache is working correctly!');
  } else {
    console.log('⚠️  Cache might not be working (second request should be faster and cached)');
  }
  
  // Test 3: slotslaunch route (should use database)
  console.log('\n📊 Test 3: /api/slotslaunch (should use database)');
  console.log('-'.repeat(60));
  
  for (const query of testQueries) {
    const result = await testSlotsLaunch(query);
    const status = result.success ? '✅' : '❌';
    
    console.log(`${status} "${query}": ${result.results} results, ${result.duration}ms`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Test 4: API usage tracking (if session token provided)
  const sessionToken = process.env.TEST_SESSION_TOKEN;
  if (sessionToken) {
    console.log('\n📈 Test 4: API usage tracking');
    console.log('-'.repeat(60));
    
    // Get initial usage
    try {
      const usageUrl = `${BASE_URL}/api/user-usage?session=${encodeURIComponent(sessionToken)}`;
      const usageRes = await fetch(usageUrl);
      const usageData = await usageRes.json();
      
      if (usageData.success) {
        const initialSearches = usageData.monthlySearches || 0;
        console.log(`Initial API usage: ${initialSearches} searches`);
        
        // Make a search
        await testSlotsSuggest('test game', sessionToken);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check usage again
        const usageRes2 = await fetch(usageUrl);
        const usageData2 = await usageRes2.json();
        
        if (usageData2.success) {
          const newSearches = usageData2.monthlySearches || 0;
          const increment = newSearches - initialSearches;
          console.log(`After search: ${newSearches} searches (+${increment})`);
          
          if (increment === 1) {
            console.log('✅ API usage incremented correctly');
          } else {
            console.log(`⚠️  API usage incremented by ${increment} (expected 1)`);
          }
          
          // Make same search again (should use cache, not increment)
          await testSlotsSuggest('test game', sessionToken);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const usageRes3 = await fetch(usageUrl);
          const usageData3 = await usageRes3.json();
          
          if (usageData3.success) {
            const finalSearches = usageData3.monthlySearches || 0;
            const secondIncrement = finalSearches - newSearches;
            console.log(`After cached search: ${finalSearches} searches (+${secondIncrement})`);
            
            if (secondIncrement === 0) {
              console.log('✅ Cached requests do NOT increment API usage (correct!)');
            } else {
              console.log(`❌ Cached request incremented usage by ${secondIncrement} (should be 0)`);
            }
          }
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not test API usage: ${error.message}`);
    }
  } else {
    console.log('\n📈 Test 4: API usage tracking (skipped - no session token)');
    console.log('   Set TEST_SESSION_TOKEN env var to test API usage tracking');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Testing complete!');
  console.log('\n📝 Check your server logs to verify:');
  console.log('   ✅ Should see "Database Query" messages');
  console.log('   ✅ Should see "game_reviews table" or "slotslaunch_games table"');
  console.log('   ❌ Should NOT see external API URLs (slot-streamers.com, etc.)');
  console.log('   ❌ Should NOT see "x-api-key" headers in fetch calls');
}

// Run tests
runTests().catch(console.error);


