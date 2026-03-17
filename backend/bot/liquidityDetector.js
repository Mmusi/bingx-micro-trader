// bot/liquidityDetector.js — Equal highs/lows, stop cluster detection

/**
 * Detect liquidity traps (equal highs/lows, potential stop hunts)
 * @returns { trapped, type:'STOP_HUNT_UP'|'STOP_HUNT_DOWN'|null, reverseDirection }
 */
function detectLiquidityTrap(candles) {
  if (candles.length < 20) return { trapped: false };

  const window   = candles.slice(-30);
  const last     = candles[candles.length - 1];
  const prev     = candles[candles.length - 2];

  // Equal highs — potential long stop hunt
  const recentHighs = window.slice(-10).map(c => c.high);
  const equalHighs  = countNear(recentHighs, 0.002);

  // Equal lows — potential short stop hunt
  const recentLows  = window.slice(-10).map(c => c.low);
  const equalLows   = countNear(recentLows,  0.002);

  // Wick rejection pattern — spike beyond level then close back inside
  const longUpperWick  = (last.high - Math.max(last.open, last.close)) / (last.high - last.low + 0.001) > 0.6;
  const longLowerWick  = (Math.min(last.open, last.close) - last.low)  / (last.high - last.low + 0.001) > 0.6;

  // Fake breakout up (sweep highs) → SHORT
  if (equalHighs >= 2 && longUpperWick && last.close < prev.high) {
    return { trapped: true, type: 'STOP_HUNT_UP', reverseDirection: 'SHORT' };
  }

  // Fake breakout down (sweep lows) → LONG
  if (equalLows >= 2 && longLowerWick && last.close > prev.low) {
    return { trapped: true, type: 'STOP_HUNT_DOWN', reverseDirection: 'LONG' };
  }

  return { trapped: false };
}

function countNear(values, tolerance) {
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (Math.abs(values[i] - values[j]) / values[i] < tolerance) count++;
    }
  }
  return count;
}

module.exports = { detectLiquidityTrap };
