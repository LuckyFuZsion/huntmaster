/**
 * HuntMaster Calculation Logic for Wix Velo
 * Simplified version - assumes you already have start/end balance, total win amount, etc.
 */

/**
 * Calculate Average X Win
 * Average multiplier of all opened bonuses
 */
function calculateAvgXWin(bonuses) {
  const opened = bonuses.filter(b => b.winAmount && b.winAmount > 0);
  
  if (opened.length === 0) return 0;
  
  const totalXWin = opened.reduce((sum, bonus) => {
    const xWin = bonus.winAmount / bonus.betSize;
    return sum + xWin;
  }, 0);
  
  return totalXWin / opened.length;
}

/**
 * Calculate Required Average X
 * What multiplier is needed on remaining bonuses to break even
 */
function calculateRequiredAvgX(startBalance, endBalance, totalWinAmount, bonuses) {
  // Remaining balance = start - end - total wins
  const remainingBalance = startBalance - endBalance - totalWinAmount;
  
  // Remaining bet size = sum of bets for unopened bonuses
  const remainingBetSize = bonuses.reduce((sum, bonus) => {
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

/**
 * Calculate Best and Worst Wins
 */
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

/**
 * Calculate Best X Win (Highest Multiplier)
 */
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

/**
 * Calculate All Statistics
 * Returns everything in one object
 */
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

// Export for Wix Velo
export {
  calculateAvgXWin,
  calculateRequiredAvgX,
  calculateBestWorstWins,
  calculateBestXWin,
  calculateAllStats
};
