#!/usr/bin/env node

/**
 * Check API Key by Key ID
 * 
 * This script helps verify API key usage and rate limits by Key ID.
 * Note: This requires access to the API key database or admin endpoint.
 * 
 * Usage:
 *   node scripts/check-api-key-by-id.js <key-id>
 */

const keyId = process.argv[2];

if (!keyId) {
  console.error('❌ Error: Key ID not provided');
  console.log('\nUsage:');
  console.log('  node scripts/check-api-key-by-id.js <key-id>');
  console.log('\nExample:');
  console.log('  node scripts/check-api-key-by-id.js 1231c42e-32ae-40f8-8183-51d2f0a17388');
  process.exit(1);
}

console.log('🔍 Checking API Key Status...\n');
console.log(`Key ID: ${keyId}\n`);

// Note: This script would need access to an admin endpoint or database
// to check key status by ID. For now, we'll test with the actual API key.

// Load environment variables from .env.local if it exists
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
let apiKey = null;

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
        if (key === 'SLOT_STREAMERS_API_KEY') {
          apiKey = value;
        }
      }
    }
  });
}

if (!apiKey) {
  console.error('❌ Error: SLOT_STREAMERS_API_KEY not found in .env.local');
  console.log('\nPlease set SLOT_STREAMERS_API_KEY in your .env.local file');
  process.exit(1);
}

// Test the API key
async function testApiKey() {
  const base = process.env.SLOT_STREAMERS_API_URL || 'https://www.slot-streamers.com/api/commercial';
  const url = `${base}/game-reviews?search=test&limit=1`;
  
  console.log('📡 Testing API Key...');
  console.log(`   Endpoint: ${base}/game-reviews`);
  
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
        const retryAfter = parseInt(headers['retry-after']);
        const retryTime = new Date(Date.now() + retryAfter * 1000);
        console.log(`   Retry after: ${retryAfter} seconds (${retryTime.toLocaleString()})`);
      }
    } else if (res.status === 401) {
      console.log('   ❌ UNAUTHORIZED - Invalid API key');
      console.log('   The API key in .env.local does not match the Key ID provided');
    } else if (res.status === 200) {
      console.log('   ✅ API key is valid and working');
    }

    // Check for rate limit headers
    console.log('\n   Rate Limit Headers:');
    if (headers['x-ratelimit-limit']) {
      console.log(`   - Limit: ${headers['x-ratelimit-limit']} requests`);
    }
    if (headers['x-ratelimit-remaining']) {
      console.log(`   - Remaining: ${headers['x-ratelimit-remaining']} requests`);
    }
    if (headers['x-ratelimit-used']) {
      console.log(`   - Used: ${headers['x-ratelimit-used']} requests`);
    }
    if (headers['x-ratelimit-reset']) {
      const resetTime = new Date(parseInt(headers['x-ratelimit-reset']) * 1000);
      console.log(`   - Resets at: ${resetTime.toLocaleString()}`);
    }

    // Try to get response body for additional info
    if (res.ok) {
      try {
        const data = await res.json();
        if (data.pagination) {
          console.log(`\n   Response Info:`);
          console.log(`   - Total results available: ${data.pagination.total || 'N/A'}`);
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
          if (errorJson.retryAfter) {
            console.log(`   Retry after: ${errorJson.retryAfter} seconds`);
          }
        } catch (e) {
          console.log(`\n   Error Response: ${errorText.substring(0, 200)}`);
        }
      }
    }

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('\n📋 Summary:');
  console.log('   - If you see 429 errors, you have exceeded your rate limit');
  console.log('   - If you see 401 errors, your API key is invalid');
  console.log('   - Rate limit headers (if present) show your current usage');
  console.log('   - Contact the API provider to check your tier and limits\n');
}

testApiKey().catch(console.error);

