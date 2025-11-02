# Step-by-Step API Integration Guide

This guide will walk you through integrating the Slot Streamers Commercial API into your project.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Getting Your API Key](#getting-your-api-key)
3. [Base URL Configuration](#base-url-configuration)
4. [Integration by Language/Framework](#integration-by-languageframework)
5. [Testing Your Integration](#testing-your-integration)
6. [Error Handling](#error-handling)
7. [Rate Limiting Best Practices](#rate-limiting-best-practices)
8. [Common Use Cases](#common-use-cases)

---

## Prerequisites

- **API Key**: You'll need a valid API key (see step 2)
- **HTTP Client**: Your project needs to be able to make HTTP requests
- **Production Base URL**: `https://www.slot-streamers.com/api/commercial`
- **Development/Testing**: Contact for local testing setup if needed

---

## Getting Your API Key

### Option 1: Request an API Key (Production)

Contact the API administrator to receive your API key. You'll need to provide:
- Your name/organization
- Intended use case
- Desired tier (Free, Basic, Premium, or Enterprise)

You'll receive:
- **API Key**: A 64-character hexadecimal string
- **Rate Limit Information**: Based on your tier
- **Documentation**: Access to this guide

### Option 2: Generate Test Key (Development)

If you have database access, you can generate a test key:

```bash
node scripts/create-test-api-key.js
```

This will output your API key - **save it immediately** as it won't be shown again.

---

## Base URL Configuration

### Production
```
https://www.slot-streamers.com/api/commercial
```

### Development/Testing (if available)
```
http://localhost:3000/api/commercial
```

**Important**: Always use environment variables to store your base URL and API key. Never commit API keys to version control!

---

## Integration by Language/Framework

### JavaScript/Node.js (Basic)

#### Step 1: Create API Client Module

Create a file `src/lib/slotStreamersApi.js`:

```javascript
const API_KEY = process.env.SLOT_STREAMERS_API_KEY;
const BASE_URL = process.env.SLOT_STREAMERS_API_URL || 'https://www.slot-streamers.com/api/commercial';

class SlotStreamersAPI {
  constructor(apiKey, baseUrl = BASE_URL) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // List game reviews
  async getGameReviews(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/game-reviews?${queryString}`);
  }

  // Get single game review by slug
  async getGameReview(slug, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/game-reviews/${slug}?${queryString}`);
  }

  // List casino reviews
  async getCasinoReviews(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/casino-reviews?${queryString}`);
  }

  // Get developers
  async getDevelopers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/developers?${queryString}`);
  }

  // Get platform statistics
  async getStats() {
    return this.request('/stats');
  }
}

module.exports = SlotStreamersAPI;
```

#### Step 2: Create Environment Variables

Create/update `.env`:

```bash
SLOT_STREAMERS_API_KEY=your-api-key-here
SLOT_STREAMERS_API_URL=https://www.slot-streamers.com/api/commercial
```

#### Step 3: Use the API Client

```javascript
const SlotStreamersAPI = require('./src/lib/slotStreamersApi');

// Initialize client
const api = new SlotStreamersAPI(process.env.SLOT_STREAMERS_API_KEY);

// Example 1: Get first page of game reviews
async function getGames() {
  try {
    const result = await api.getGameReviews({
      page: 1,
      limit: 20,
      include_ratings: true
    });
    
    console.log(`Found ${result.pagination.total} games`);
    result.data.forEach(game => {
      console.log(`${game.title} by ${game.developer}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 2: Get games by developer
async function getGamesByDeveloper(developer) {
  try {
    const result = await api.getGameReviews({
      developer: developer,
      limit: 10
    });
    return result.data;
  } catch (error) {
    console.error('Error:', error.message);
    return [];
  }
}

// Example 3: Get specific game
async function getGameDetails(slug) {
  try {
    const result = await api.getGameReview(slug, {
      include_ratings: true,
      include_comments: true
    });
    return result.data;
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

// Run examples
getGames();
```

---

### TypeScript/Next.js (Modern Setup)

#### Step 1: Install Dependencies

```bash
npm install axios  # or use fetch which is built-in
```

#### Step 2: Create Type Definitions

Create `src/types/slot-streamers-api.ts`:

```typescript
export interface GameReview {
  id: number;
  slug: string;
  title: string;
  developer: string;
  release_date: string;
  rtp_range: string;
  volatility: string;
  max_win: string;
  overview: string;
  gameplay_features: string;
  final_thoughts: string;
  thumbnail_url: string;
  banner_url: string;
  demo_url: string;
  average_rating: number;
  total_ratings: number;
  features: {
    gameplay_features: string;
    technical_specs: {
      volatility: string;
      rtp_range: string;
      max_win: string;
    };
    demo_url: string;
  };
  verdict: {
    final_thoughts: string;
    average_rating: number;
    total_ratings: number;
  };
  user_ratings?: Rating[];
  created_at: string;
  updated_at: string;
}

export interface Rating {
  game_review_id: number;
  rating: number;
  review_text: string;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta: {
    timestamp: string;
    version: string;
  };
}

export interface GameReviewsParams {
  page?: number;
  limit?: number;
  developer?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  include_ratings?: boolean;
  include_screenshots?: boolean;
}
```

#### Step 3: Create API Client

Create `src/lib/slot-streamers-api.ts`:

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  GameReview,
  ApiResponse,
  GameReviewsParams,
} from '@/types/slot-streamers-api';

export class SlotStreamersAPI {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    if (!apiKey) {
      throw new Error('API key is required');
    }

    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://www.slot-streamers.com/api/commercial';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const data = error.response.data as any;
          throw new Error(data.error || `API Error: ${error.response.status}`);
        }
        throw error;
      }
    );
  }

  async getGameReviews(params?: GameReviewsParams): Promise<ApiResponse<GameReview[]>> {
    const response = await this.client.get<ApiResponse<GameReview[]>>('/game-reviews', {
      params,
    });
    return response.data;
  }

  async getGameReview(
    slug: string,
    params?: { include_ratings?: boolean; include_comments?: boolean }
  ): Promise<ApiResponse<GameReview>> {
    const response = await this.client.get<ApiResponse<GameReview>>(
      `/game-reviews/${slug}`,
      { params }
    );
    return response.data;
  }

  async getCasinoReviews(params?: any): Promise<ApiResponse<any[]>> {
    const response = await this.client.get('/casino-reviews', { params });
    return response.data;
  }

  async getDevelopers(params?: any): Promise<ApiResponse<any[]>> {
    const response = await this.client.get('/developers', { params });
    return response.data;
  }

  async getStats(): Promise<ApiResponse<any>> {
    const response = await this.client.get('/stats');
    return response.data;
  }
}

// Export singleton instance (optional)
export function createSlotStreamersAPI(): SlotStreamersAPI {
  const apiKey = process.env.NEXT_PUBLIC_SLOT_STREAMERS_API_KEY || process.env.SLOT_STREAMERS_API_KEY;
  if (!apiKey) {
    throw new Error('SLOT_STREAMERS_API_KEY environment variable is required');
  }
  return new SlotStreamersAPI(apiKey);
}
```

#### Step 4: Use in Next.js Components

Create `app/games/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { createSlotStreamersAPI } from '@/lib/slot-streamers-api';
import type { GameReview } from '@/types/slot-streamers-api';

export default function GamesPage() {
  const [games, setGames] = useState<GameReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGames() {
      try {
        const api = createSlotStreamersAPI();
        const response = await api.getGameReviews({
          page: 1,
          limit: 20,
          include_ratings: true,
        });
        setGames(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchGames();
    }, []);

  if (loading) return <div>Loading games...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Game Reviews</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {games.map((game) => (
          <div key={game.id} className="border p-4 rounded">
            <img src={game.thumbnail_url} alt={game.title} />
            <h2>{game.title}</h2>
            <p>Developer: {game.developer}</p>
            <p>Rating: {game.average_rating}/5 ({game.total_ratings} ratings)</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### Python

#### Step 1: Install Dependencies

```bash
pip install requests python-dotenv
```

#### Step 2: Create API Client

Create `slot_streamers_api.py`:

```python
import os
import requests
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv

load_dotenv()

class SlotStreamersAPI:
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or os.getenv('SLOT_STREAMERS_API_KEY')
        self.base_url = base_url or os.getenv(
            'SLOT_STREAMERS_API_URL',
            'https://www.slot-streamers.com/api/commercial'
        )
        
        if not self.api_key:
            raise ValueError('API key is required')

    def _request(self, endpoint: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        headers = {
            'x-api-key': self.api_key,
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.get(url, headers=headers, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            if e.response is not None:
                error_data = e.response.json()
                raise Exception(error_data.get('error', f'API Error: {e.response.status_code}'))
            raise
        except requests.exceptions.RequestException as e:
            raise Exception(f'Network error: {str(e)}')

    def get_game_reviews(
        self,
        page: int = 1,
        limit: int = 20,
        developer: Optional[str] = None,
        search: Optional[str] = None,
        include_ratings: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        params = {
            'page': page,
            'limit': limit,
            'include_ratings': str(include_ratings).lower(),
            **kwargs
        }
        if developer:
            params['developer'] = developer
        if search:
            params['search'] = search
            
        return self._request('/game-reviews', params=params)

    def get_game_review(
        self,
        slug: str,
        include_ratings: bool = False,
        include_comments: bool = False
    ) -> Dict[str, Any]:
        params = {
            'include_ratings': str(include_ratings).lower(),
            'include_comments': str(include_comments).lower(),
        }
        return self._request(f'/game-reviews/{slug}', params=params)

    def get_casino_reviews(self, **kwargs) -> Dict[str, Any]:
        return self._request('/casino-reviews', params=kwargs)

    def get_developers(self, **kwargs) -> Dict[str, Any]:
        return self._request('/developers', params=kwargs)

    def get_stats(self) -> Dict[str, Any]:
        return self._request('/stats')


# Example usage
if __name__ == '__main__':
    api = SlotStreamersAPI()
    
    # Get game reviews
    result = api.get_game_reviews(page=1, limit=10, include_ratings=True)
    print(f"Found {result['pagination']['total']} games")
    for game in result['data']:
        print(f"- {game['title']} by {game['developer']}")
```

#### Step 3: Create `.env` File

```bash
SLOT_STREAMERS_API_KEY=your-api-key-here
SLOT_STREAMERS_API_URL=https://www.slot-streamers.com/api/commercial
```

---

### PHP

#### Step 1: Create API Client Class

Create `SlotStreamersAPI.php`:

```php
<?php

class SlotStreamersAPI {
    private $apiKey;
    private $baseUrl;

    public function __construct($apiKey, $baseUrl = null) {
        if (empty($apiKey)) {
            throw new Exception('API key is required');
        }
        
        $this->apiKey = $apiKey;
        $this->baseUrl = $baseUrl ?? 'https://www.slot-streamers.com/api/commercial';
    }

    private function request($endpoint, $params = []) {
        $url = $this->baseUrl . $endpoint;
        
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'x-api-key: ' . $this->apiKey,
                'Content-Type: application/json'
            ],
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception('Network error: ' . $error);
        }

        $data = json_decode($response, true);

        if ($httpCode !== 200) {
            $errorMessage = isset($data['error']) ? $data['error'] : "API Error: $httpCode";
            throw new Exception($errorMessage);
        }

        return $data;
    }

    public function getGameReviews($params = []) {
        return $this->request('/game-reviews', $params);
    }

    public function getGameReview($slug, $params = []) {
        return $this->request("/game-reviews/$slug", $params);
    }

    public function getCasinoReviews($params = []) {
        return $this->request('/casino-reviews', $params);
    }

    public function getDevelopers($params = []) {
        return $this->request('/developers', $params);
    }

    public function getStats() {
        return $this->request('/stats');
    }
}

// Example usage
$api = new SlotStreamersAPI(getenv('SLOT_STREAMERS_API_KEY'));

try {
    $result = $api->getGameReviews([
        'page' => 1,
        'limit' => 10,
        'include_ratings' => 'true'
    ]);
    
    echo "Found " . $result['pagination']['total'] . " games\n";
    foreach ($result['data'] as $game) {
        echo "- " . $game['title'] . " by " . $game['developer'] . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
```

---

## Testing Your Integration

### Step 1: Test Basic Connection

```javascript
// JavaScript/Node.js example
const api = new SlotStreamersAPI(process.env.SLOT_STREAMERS_API_KEY);

// Simple test
api.getStats()
  .then(result => console.log('✅ API connection successful!', result))
  .catch(error => console.error('❌ API connection failed:', error.message));
```

### Step 2: Test Game Reviews Endpoint

```javascript
// Test getting game reviews
api.getGameReviews({ limit: 5 })
  .then(result => {
    console.log(`✅ Successfully retrieved ${result.data.length} games`);
    console.log(`Total available: ${result.pagination.total}`);
  })
  .catch(error => console.error('Error:', error.message));
```

### Step 3: Test Error Handling

Try making a request without an API key or with an invalid key to ensure error handling works correctly.

---

## Error Handling

Always implement proper error handling:

```javascript
try {
  const result = await api.getGameReviews();
  // Process result
} catch (error) {
  if (error.message.includes('API key')) {
    // Handle authentication errors
    console.error('Authentication failed. Check your API key.');
  } else if (error.message.includes('Rate limit')) {
    // Handle rate limit errors
    console.error('Rate limit exceeded. Please wait before making more requests.');
  } else if (error.message.includes('404')) {
    // Handle not found errors
    console.error('Resource not found.');
  } else {
    // Handle other errors
    console.error('An error occurred:', error.message);
  }
}
```

**Common Error Codes:**
- `MISSING_API_KEY` (401): API key not provided
- `INVALID_API_KEY` (401): Invalid or expired API key
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `NOT_FOUND` (404): Resource doesn't exist
- `DATABASE_ERROR` (500): Server-side database error

---

## Rate Limiting Best Practices

### 1. Respect Rate Limits

Check rate limit headers in responses:
```javascript
const response = await fetch(url, { headers });
const remaining = response.headers.get('X-RateLimit-Remaining');
const reset = response.headers.get('X-RateLimit-Reset');

console.log(`Remaining requests: ${remaining}`);
console.log(`Resets at: ${new Date(parseInt(reset) * 1000)}`);
```

### 2. Implement Exponential Backoff

```javascript
async function requestWithRetry(apiCall, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.message.includes('Rate limit') && i < maxRetries - 1) {
        const waitTime = Math.pow(2, i) * 1000; // Exponential backoff
        console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
}
```

### 3. Cache Responses

Cache responses to reduce API calls:
```javascript
const cache = new Map();

async function getCachedGameReviews(params) {
  const cacheKey = JSON.stringify(params);
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const result = await api.getGameReviews(params);
  cache.set(cacheKey, result);
  
  // Clear cache after 5 minutes
  setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000);
  
  return result;
}
```

---

## Common Use Cases

### 1. Display Games on Homepage

```javascript
// Fetch featured/popular games
const games = await api.getGameReviews({
  limit: 10,
  sort_by: 'average_rating',
  sort_order: 'desc',
  include_ratings: true
});

// Display on homepage
games.data.forEach(game => {
  // Render game card with title, thumbnail, rating
});
```

### 2. Developer-Specific Game Listing

```javascript
// Get all Pragmatic Play games
const pragmaticGames = await api.getGameReviews({
  developer: 'Pragmatic Play',
  limit: 50,
  include_ratings: true
});
```

### 3. Game Detail Page

```javascript
// Get full game details
const game = await api.getGameReview('gates-of-olympus', {
  include_ratings: true,
  include_comments: true,
  include_screenshots: true
});

// Display full game review page
```

### 4. Search Functionality

```javascript
// Search for games
const results = await api.getGameReviews({
  search: 'olympus',
  limit: 20
});

// Display search results
```

### 5. Pagination

```javascript
async function getAllGames() {
  let allGames = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await api.getGameReviews({
      page,
      limit: 100 // Maximum allowed
    });

    allGames = allGames.concat(result.data);
    hasMore = page < result.pagination.totalPages;
    page++;
    
    // Be respectful of rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return allGames;
}
```

---

## Next Steps

1. ✅ Set up your API client
2. ✅ Test basic connectivity
3. ✅ Implement error handling
4. ✅ Add rate limiting respect
5. ✅ Build your application features
6. ✅ Monitor API usage

---

## Support

- **Documentation**: This guide
- **API Docs**: See `COMMERCIAL_API_DOCUMENTATION.md`
- **Support Email**: Contact the API administrator
- **Status**: Check for API status updates

---

## Security Best Practices

1. ✅ **Never commit API keys** to version control
2. ✅ **Use environment variables** for sensitive data
3. ✅ **Implement request caching** to reduce API calls
4. ✅ **Monitor usage** to stay within rate limits
5. ✅ **Use HTTPS** in production (always enforced by API)
6. ✅ **Store API keys securely** (e.g., secrets manager in production)

---

Happy integrating! 🚀

