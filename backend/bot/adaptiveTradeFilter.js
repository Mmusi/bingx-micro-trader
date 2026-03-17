// bot/adaptiveTradeFilter.js — Pre-execution gate: rejects bad market conditions

const log = require('../utils/logger');

/**
 * Returns { allowed, reason }
 */
function filterTrade({ spread, spreadPct, atr, price, volatility, liquidationDistance, aiScore }) {
  // 1. Spread too wide (> 0.1% of price)
  if (spreadPct != null && spreadPct > 0.001) {
    return { allowed: false, reason: `Spread too wide: ${(spreadPct * 100).toFixed(3)}%` };
  }

  // 2. Volatility dangerously high (ATR > 1.5% = very spiky)
  if (volatility != null && volatility > 0.015) {
    return { allowed: false, reason: `Volatility too high: ${(volatility * 100).toFixed(2)}%` };
  }

  // 3. Liquidation distance too close (< 1% from estimated liquidation)
  if (liquidationDistance != null && liquidationDistance < 0.01) {
    return { allowed: false, reason: `Liquidation too close: ${(liquidationDistance * 100).toFixed(2)}%` };
  }

  // 4. AI score too low
  if (aiScore != null && aiScore < 40) {
    return { allowed: false, reason: `AI score too low: ${aiScore}` };
  }

  return { allowed: true, reason: 'OK' };
}

module.exports = { filterTrade };
