# Biggest Win Only vs All Wins - Cost Analysis

## Current System: Save All Wins

### Storage & Costs:
- **Storage**: 1 row per win (could be 100s-1000s per user)
- **Writes**: Every win creates a new row
- **Reads**: Queries scan all wins to find biggest/recent
- **Egress**: All wins transferred when querying

### Example User with 500 wins:
- **Storage**: 500 rows × ~200 bytes = ~100 KB
- **Writes**: 500 write operations
- **Egress per query**: 500 rows × ~200 bytes = ~100 KB

## Alternative: Save Only Biggest Win Per Game

### Storage & Costs:
- **Storage**: 1 row per game (typically 20-50 games per user)
- **Writes**: Only write if new win is bigger (UPDATE instead of INSERT)
- **Reads**: Much smaller table = faster queries
- **Egress**: Minimal (only biggest wins)

### Example User with 500 wins across 30 games:
- **Storage**: 30 rows × ~200 bytes = ~6 KB (94% reduction)
- **Writes**: 30 write operations (94% reduction)
- **Egress per query**: 30 rows × ~200 bytes = ~6 KB (94% reduction)

## Cost Comparison

| Metric | All Wins | Biggest Only | Savings |
|--------|----------|--------------|---------|
| **Storage** | 100 KB | 6 KB | **94%** |
| **Writes** | 500 | 30 | **94%** |
| **Egress (per query)** | 100 KB | 6 KB | **94%** |
| **Query Speed** | Slower (scan 500 rows) | Faster (scan 30 rows) | **~95% faster** |

## Features Impact

### ✅ Would Still Work:
- **Best win per game** - Perfect, that's what we'd store
- **Overall best win** - Easy, just find max from biggest wins
- **Widgets showing best wins** - Works perfectly
- **Game-specific best wins** - Exactly what we'd have

### ❌ Would Lose:
- **Wins dashboard** (`/wins-dashboard`) - Shows all wins over time period
- **Recent wins query** - Shows wins from last 7/30 days
- **Win history/timeline** - Can't show progression over time
- **Win statistics** - Can't calculate averages, totals over time
- **Filtering by date range** - No date-based queries
- **Filtering by X win threshold** - Can't filter historical wins

## Hybrid Approach (Best of Both Worlds)

### Option 1: Keep All Wins, But Archive Old Ones
- Keep recent wins (last 30 days) in main table
- Archive older wins to separate table (rarely queried)
- **Savings**: ~70% reduction in active table size
- **Keeps**: All functionality

### Option 2: Biggest Win + Recent Wins Summary
- Store biggest win per game (permanent)
- Store summary stats (total wins, total amount, last 10 wins) per game
- **Savings**: ~80% reduction
- **Keeps**: Most functionality, loses detailed history

### Option 3: Biggest Win Only (Maximum Savings)
- Store only biggest win per game
- **Savings**: ~94% reduction
- **Loses**: All historical data, wins dashboard, recent wins

## Recommendation

### For Maximum Cost Savings:
**Use Option 3 (Biggest Win Only)** if:
- You don't need win history/timeline
- You only care about "best ever" wins
- Cost is the primary concern

**Implementation:**
```typescript
// Instead of INSERT, use UPSERT
await supabase
  .from('userWins')
  .upsert({
    userId,
    gameTitle,
    winAmount: Math.max(currentBiggest, newWin),
    // ... only update if new win is bigger
  }, {
    onConflict: 'userId,gameTitle',
    ignoreDuplicates: false
  })
```

### For Balanced Approach:
**Use Option 1 (Archive Old Wins)** if:
- You want to keep functionality
- But reduce active table size
- Archive wins older than 30 days

**Implementation:**
- Keep wins from last 30 days in `userWins`
- Move older wins to `userWinsArchive` table
- Query archive only when needed

## Cost Savings Estimate

### Scenario: 100 active users, average 500 wins each

**Current (All Wins):**
- Storage: 50,000 rows × 200 bytes = 10 MB
- Monthly egress: ~100 queries × 10 MB = 1 GB
- **Cost**: ~$0.10-0.50/month (depending on plan)

**Biggest Win Only:**
- Storage: 3,000 rows × 200 bytes = 600 KB
- Monthly egress: ~100 queries × 600 KB = 60 MB
- **Cost**: ~$0.01-0.05/month
- **Savings**: ~90% reduction

## Conclusion

**Yes, it's significantly cheaper** to save only biggest wins:
- **94% reduction** in storage
- **94% reduction** in writes
- **94% reduction** in egress
- **Much faster queries**

**But you lose:**
- Win history/timeline
- Recent wins dashboard
- Win statistics over time

**Recommendation**: If cost is critical and you don't need history, go with biggest win only. Otherwise, use the archive approach to keep functionality while reducing costs.

