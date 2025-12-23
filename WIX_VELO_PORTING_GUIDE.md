# Wix Velo Porting Guide - HuntMaster Calculation Logic

Simple guide for calculating bonus hunt statistics in Wix Velo.

## What You Already Have

- **Start Balance**: Starting balance for the hunt
- **End Balance**: Ending balance
- **Total Bonuses**: Total number of bonuses
- **Bonuses Opened**: Number of bonuses that have been opened (have a win amount)
- **Bet Size**: Bet size for each bonus
- **Win Amount**: Win amount for each bonus (null/empty if not opened)
- **Total Win Amount**: Sum of all win amounts (already calculated)
- **Remaining Balance**: Remaining balance (already calculated)

## What You Need to Calculate

1. **Average X Win** - Average multiplier of opened bonuses
2. **Required Average X** - What multiplier is needed on remaining bonuses to break even
3. **Best/Worst Wins** - Highest and lowest wins
4. **Best X Win** - Highest multiplier achieved

## Core Calculation Functions

### 1. Average X Win

```javascript
function calculateAvgXWin(bonuses) {
  // Filter to only opened bonuses (have a win amount)
  const opened = bonuses.filter(b => b.winAmount && b.winAmount > 0);
  
  if (opened.length === 0) return 0;
  
  // Calculate X Win for each: winAmount / betSize
  const totalXWin = opened.reduce((sum, bonus) => {
    const xWin = bonus.winAmount / bonus.betSize;
    return sum + xWin;
  }, 0);
  
  return totalXWin / opened.length;
}
```

### 2. Required Average X

```javascript
function calculateRequiredAvgX(startBalance, endBalance, totalWinAmount, bonuses) {
  // Remaining balance = start - end - total wins
  const remainingBalance = startBalance - endBalance - totalWinAmount;
  
  // Remaining bet size = sum of bets for unopened bonuses
  const remainingBetSize = bonuses.reduce((sum, bonus) => {
    // If no win amount, bonus is not opened yet
    if (!bonus.winAmount || bonus.winAmount === 0) {
      return sum + bonus.betSize;
    }
    return sum;
  }, 0);
  
  // Required X = remaining balance / remaining bet size
  if (remainingBetSize > 0) {
    return remainingBalance / remainingBetSize;
  }
  
  return 0;
}
```

### 3. Best/Worst Wins

```javascript
function calculateBestWorstWins(bonuses) {
  const opened = bonuses.filter(b => b.winAmount && b.winAmount > 0);
  
  if (opened.length === 0) {
    return {
      best: { name: "", betSize: 0, winAmount: 0, xWin: 0 },
      worst: { name: "", betSize: 0, winAmount: 0, xWin: 0 }
    };
  }
  
  let best = { name: "", betSize: 0, winAmount: 0, xWin: 0 };
  let worst = { name: "", betSize: 0, winAmount: Infinity, xWin: Infinity };
  
  opened.forEach(bonus => {
    const xWin = bonus.winAmount / bonus.betSize;
    
    // Best = highest win amount
    if (bonus.winAmount > best.winAmount) {
      best = {
        name: bonus.name || "",
        betSize: bonus.betSize,
        winAmount: bonus.winAmount,
        xWin: xWin
      };
    }
    
    // Worst = lowest win amount
    if (bonus.winAmount < worst.winAmount) {
      worst = {
        name: bonus.name || "",
        betSize: bonus.betSize,
        winAmount: bonus.winAmount,
        xWin: xWin
      };
    }
  });
  
  return { best, worst };
}
```

### 4. Best X Win (Highest Multiplier)

```javascript
function calculateBestXWin(bonuses) {
  const opened = bonuses.filter(b => b.winAmount && b.winAmount > 0);
  
  if (opened.length === 0) return 0;
  
  let bestXWin = 0;
  
  opened.forEach(bonus => {
    const xWin = bonus.winAmount / bonus.betSize;
    if (xWin > bestXWin) {
      bestXWin = xWin;
    }
  });
  
  return bestXWin;
}
```

### 5. Complete Function (All Stats)

```javascript
function calculateAllStats(bonuses, startBalance, endBalance, totalWinAmount) {
  const openedCount = bonuses.filter(b => b.winAmount && b.winAmount > 0).length;
  const totalCount = bonuses.length;
  const remainingCount = totalCount - openedCount;
  
  // Calculate remaining bet size
  const remainingBetSize = bonuses.reduce((sum, bonus) => {
    if (!bonus.winAmount || bonus.winAmount === 0) {
      return sum + bonus.betSize;
    }
    return sum;
  }, 0);
  
  // Remaining balance
  const remainingBalance = startBalance - endBalance - totalWinAmount;
  
  // All calculations
  const avgXWin = calculateAvgXWin(bonuses);
  const avgXReq = calculateRequiredAvgX(startBalance, endBalance, totalWinAmount, bonuses);
  const { best, worst } = calculateBestWorstWins(bonuses);
  const bestXWin = calculateBestXWin(bonuses);
  
  return {
    // Counts
    totalBonuses: totalCount,
    openedBonuses: openedCount,
    remainingBonuses: remainingCount,
    
    // Amounts
    totalWinAmount: totalWinAmount,
    remainingBalance: remainingBalance,
    remainingBetSize: remainingBetSize,
    
    // Multipliers
    avgXWin: avgXWin,
    avgXReq: avgXReq,
    bestXWin: bestXWin,
    
    // Best/Worst
    bestWin: best,
    worstWin: worst
  };
}
```

## Wix Velo Implementation

### Backend File: `backend/huntCalculations.js`

```javascript
import wixData from 'wix-data';

// Copy all the calculation functions above here

export async function getHuntStats(userId, huntId) {
  try {
    // Get bonuses for this hunt
    const bonuses = await wixData.query('Bonuses')
      .eq('userId', userId)
      .eq('huntId', huntId)
      .find();
    
    // Get hunt settings
    const hunt = await wixData.get('Hunts', huntId);
    
    const startBalance = hunt.startBalance;
    const endBalance = hunt.endBalance || hunt.startBalance;
    
    // Calculate total win amount
    const totalWinAmount = bonuses.items.reduce((sum, b) => {
      return sum + (b.winAmount || 0);
    }, 0);
    
    // Calculate all stats
    const stats = calculateAllStats(
      bonuses.items,
      startBalance,
      endBalance,
      totalWinAmount
    );
    
    return {
      success: true,
      data: stats
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

### Frontend Usage

```javascript
import { getHuntStats } from 'backend/huntCalculations';

$w.onReady(function () {
  const userId = getCurrentUserId(); // Your auth method
  const huntId = getCurrentHuntId(); // Your hunt ID
  
  getHuntStats(userId, huntId)
    .then(result => {
      if (result.success) {
        const stats = result.data;
        
        // Display stats
        $w('#avgXWin').text = `${stats.avgXWin.toFixed(2)}x`;
        $w('#avgXReq').text = `${stats.avgXReq.toFixed(2)}x`;
        $w('#bestXWin').text = `${stats.bestXWin.toFixed(2)}x`;
        $w('#totalWin').text = stats.totalWinAmount.toFixed(2);
        $w('#openedCount').text = `${stats.openedBonuses}/${stats.totalBonuses}`;
      }
    });
});
```

## Example Data Structure

```javascript
// Your bonuses array should look like this:
const bonuses = [
  {
    name: "Game 1",
    betSize: 10,
    winAmount: 50  // Has win = opened
  },
  {
    name: "Game 2",
    betSize: 10,
    winAmount: null  // No win = not opened yet
  },
  {
    name: "Game 3",
    betSize: 10,
    winAmount: 20  // Has win = opened
  }
];

// Your hunt data:
const startBalance = 1000;
const endBalance = 950;
const totalWinAmount = 70; // 50 + 20

// Calculate:
const stats = calculateAllStats(bonuses, startBalance, endBalance, totalWinAmount);

// Result:
// {
//   totalBonuses: 3,
//   openedBonuses: 2,
//   remainingBonuses: 1,
//   totalWinAmount: 70,
//   remainingBalance: -20,
//   remainingBetSize: 10,
//   avgXWin: 3.5,  // (5x + 2x) / 2
//   avgXReq: -2,    // Need -2x (impossible)
//   bestXWin: 5,
//   bestWin: { name: "Game 1", betSize: 10, winAmount: 50, xWin: 5 },
//   worstWin: { name: "Game 3", betSize: 10, winAmount: 20, xWin: 2 }
// }
```

## Quick Reference

- **X Win** = `winAmount / betSize`
- **Average X Win** = Sum of all X Wins / Number of opened bonuses
- **Remaining Balance** = `startBalance - endBalance - totalWinAmount`
- **Remaining Bet Size** = Sum of bet sizes for unopened bonuses
- **Required Average X** = `remainingBalance / remainingBetSize`

That's it! These are the core calculations you need.
