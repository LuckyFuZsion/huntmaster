#!/usr/bin/env node

/**
 * Check API Key Rate Limits
 * 
 * This script checks the rate limits for Slot Streamers and SlotsLaunch APIs
 * by making test requests and reading rate limit headers.
 * 
 * Usage:
 *   node scripts/check-api-key-limits.js <api-key>
 *   node scripts/check-api-key-limits.js  # Uses SLOT_STREAMERS_API_KEY from .env.local
 */

// Load environment variables from .env.local if it exists
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

const apiKey = process.argv[2] || process.env.SLOT_STREAMERS_API_KEY;

if (!apiKey) {
  console.error('❌ Error: API key not provided');
  console.log('\nUsage:');
  console.log('  node scripts/check-api-key-limits.js <api-key>');
  console.log('  node scripts/check-api-key-limits.js  # Uses env var');
  console.log('\nOr set SLOT_STREAMERS_API_KEY in your environment');
  process.exit(1);
}

// Mask API key for display (show first 8 and last 8 chars)
function maskKey(key) {
  if (key.length <= 16) return '****';
  return `${key.substring(0, 8)}...${key.substring(key.length - 8)}`;
}

console.log('🔍 Checking API Key Rate Limits...\n');
console.log(`API Key: ${maskKey(apiKey)}\n`);

// Test Slot Streamers API
async function checkSlotStreamersAPI() {
  const base = process.env.SLOT_STREAMERS_API_URL || 'https://www.slot-streamers.com/api/commercial';
  const url = `${base}/game-reviews?search=starburst&limit=1`;
  
  console.log('📡 Testing Slot Streamers API...');
  console.log(`   URL: ${base}/game-reviews`);
  
  try {
    const res = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
    });

    const headers = {};
    res.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    console.log(`   Status: ${res.status} ${res.statusText}`);
    
    if (res.status === 429) {
      console.log('   ⚠️  RATE LIMITED - You have exceeded your rate limit!');
      if (headers['retry-after']) {
        console.log(`   Retry after: ${headers['retry-after']} seconds`);
      }
    } else if (res.status === 401) {
      console.log('   ❌ UNAUTHORIZED - Invalid API key');
    } else if (res.status === 200) {
      console.log('   ✅ Request successful');
    }

    // Check for rate limit headers
    const rateLimitHeaders = {
      'x-ratelimit-limit': headers['x-ratelimit-limit'],
      'x-ratelimit-remaining': headers['x-ratelimit-remaining'],
      'x-ratelimit-reset': headers['x-ratelimit-reset'],
      'x-ratelimit-used': headers['x-ratelimit-used'],
      'retry-after': headers['retry-after'],
    };

    console.log('\n   Rate Limit Headers:');
    if (rateLimitHeaders['x-ratelimit-limit']) {
      console.log(`   - Limit: ${rateLimitHeaders['x-ratelimit-limit']} requests`);
    }
    if (rateLimitHeaders['x-ratelimit-remaining']) {
      console.log(`   - Remaining: ${rateLimitHeaders['x-ratelimit-remaining']} requests`);
    }
    if (rateLimitHeaders['x-ratelimit-used']) {
      console.log(`   - Used: ${rateLimitHeaders['x-ratelimit-used']} requests`);
    }
    if (rateLimitHeaders['x-ratelimit-reset']) {
      const resetTime = new Date(parseInt(rateLimitHeaders['x-ratelimit-reset']) * 1000);
      console.log(`   - Resets at: ${resetTime.toLocaleString()}`);
    }
    if (rateLimitHeaders['retry-after']) {
      const retryAfter = parseInt(rateLimitHeaders['retry-after']);
      const retryTime = new Date(Date.now() + retryAfter * 1000);
      console.log(`   - Retry after: ${retryAfter} seconds (${retryTime.toLocaleString()})`);
    }

    if (Object.values(rateLimitHeaders).every(v => !v)) {
      console.log('   ⚠️  No rate limit headers found in response');
      console.log('   (API may not expose rate limit information)');
    }

    // Try to parse response body for additional info
    if (res.ok) {
      try {
        const data = await res.json();
        if (data.pagination) {
          console.log(`\n   Response Info:`);
          console.log(`   - Total results: ${data.pagination.total || 'N/A'}`);
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    } else {
      const errorText = await res.text();
      if (errorText) {
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error || errorJson.message) {
            console.log(`\n   Error: ${errorJson.error || errorJson.message}`);
          }
        } catch (e) {
          console.log(`\n   Error Response: ${errorText.substring(0, 200)}`);
        }
      }
    }

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('');
}

// Test SlotsLaunch API
async function checkSlotsLaunchAPI() {
  const base = process.env.SLOTSLAUNCH_API_BASE_URL || process.env.SLOT_STREAMERS_API_BASE_URL || 'https://slot-streamers.com';
  const url = `${base}/api/commercial/slotslaunch?search=starburst&limit=1`;
  
  console.log('📡 Testing SlotsLaunch API...');
  console.log(`   URL: ${base}/api/commercial/slotslaunch`);
  
  try {
    const res = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
    });

    const headers = {};
    res.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    console.log(`   Status: ${res.status} ${res.statusText}`);
    
    if (res.status === 429) {
      console.log('   ⚠️  RATE LIMITED - You have exceeded your rate limit!');
      if (headers['retry-after']) {
        console.log(`   Retry after: ${headers['retry-after']} seconds`);
      }
    } else if (res.status === 401) {
      console.log('   ❌ UNAUTHORIZED - Invalid API key');
    } else if (res.status === 200) {
      console.log('   ✅ Request successful');
    }

    // Check for rate limit headers
    const rateLimitHeaders = {
      'x-ratelimit-limit': headers['x-ratelimit-limit'],
      'x-ratelimit-remaining': headers['x-ratelimit-remaining'],
      'x-ratelimit-reset': headers['x-ratelimit-reset'],
      'x-ratelimit-used': headers['x-ratelimit-used'],
      'retry-after': headers['retry-after'],
    };

    console.log('\n   Rate Limit Headers:');
    if (rateLimitHeaders['x-ratelimit-limit']) {
      console.log(`   - Limit: ${rateLimitHeaders['x-ratelimit-limit']} requests`);
    }
    if (rateLimitHeaders['x-ratelimit-remaining']) {
      console.log(`   - Remaining: ${rateLimitHeaders['x-ratelimit-remaining']} requests`);
    }
    if (rateLimitHeaders['x-ratelimit-used']) {
      console.log(`   - Used: ${rateLimitHeaders['x-ratelimit-used']} requests`);
    }
    if (rateLimitHeaders['x-ratelimit-reset']) {
      const resetTime = new Date(parseInt(rateLimitHeaders['x-ratelimit-reset']) * 1000);
      console.log(`   - Resets at: ${resetTime.toLocaleString()}`);
    }
    if (rateLimitHeaders['retry-after']) {
      const retryAfter = parseInt(rateLimitHeaders['retry-after']);
      const retryTime = new Date(Date.now() + retryAfter * 1000);
      console.log(`   - Retry after: ${retryAfter} seconds (${retryTime.toLocaleString()})`);
    }

    if (Object.values(rateLimitHeaders).every(v => !v)) {
      console.log('   ⚠️  No rate limit headers found in response');
      console.log('   (API may not expose rate limit information)');
    }

    // Try to parse response body for additional info
    if (res.ok) {
      try {
        const data = await res.json();
        if (data.total !== undefined) {
          console.log(`\n   Response Info:`);
          console.log(`   - Total results: ${data.total || 'N/A'}`);
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    } else {
      const errorText = await res.text();
      if (errorText) {
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error || errorJson.message) {
            console.log(`\n   Error: ${errorJson.error || errorJson.message}`);
          }
        } catch (e) {
          console.log(`\n   Error Response: ${errorText.substring(0, 200)}`);
        }
      }
    }

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('');
}

// Run checks
async function main() {
  await checkSlotStreamersAPI();
  await checkSlotsLaunchAPI();
  
  console.log('📋 Summary:');
  console.log('   - If you see 429 errors, you have exceeded your rate limit');
  console.log('   - If you see 401 errors, your API key is invalid');
  console.log('   - Rate limit headers (if present) show your current usage');
  console.log('   - Contact the API provider to check your tier and limits\n');
}

main().catch(console.error);

