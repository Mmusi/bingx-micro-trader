// bot/aiSignalScorer.js — Weighted probability scorer for trade signals

const log = require('../utils/logger');

/**
 * Score a signal 0–100.
 * Returns { score, breakdown, pass }
 * pass = true if score >= minScore
 */
function scoreSignal({ direction, rsi, volume, avgVolume, atr, price, fundingBias, bbWidth, nearLevel, pattern, liquidityDistance }, minScore = 65) {

  const components = {};

  // 1. RSI extremity (0–25 pts)
  if (direction === 'LONG') {
    components.rsi = rsi <= 20 ? 25 : rsi <= 30 ? 20 : rsi <= 35 ? 14 : rsi <= 40 ? 7 : 0;
  } else {
    const inv = 100 - rsi;
    components.rsi = inv <= 20 ? 25 : inv <= 30 ? 20 : inv <= 35 ? 14 : inv <= 40 ? 7 : 0;
  }

  // 2. Volume spike (0–20 pts)
  const volRatio = avgVolume > 0 ? volume / avgVolume : 1;
  components.volume = volRatio >= 3 ? 20 : volRatio >= 2 ? 15 : volRatio >= 1.5 ? 10 : volRatio >= 1.1 ? 5 : 0;

  // 3. Near S/R level (0–20 pts)
  components.nearLevel = nearLevel ? 20 : 0;

  // 4. Candle pattern (0–15 pts)
  const patScore = { BULLISH: 15, BEARISH: 15, NEUTRAL: 0 };
  components.pattern = patScore[pattern] || 0;
  // Direction mismatch penalty
  if ((direction === 'LONG' && pattern === 'BEARISH') || (direction === 'SHORT' && pattern === 'BULLISH')) {
    components.pattern = -10;
  }

  // 5. Funding rate alignment (0–10 pts)
  if (fundingBias === direction || fundingBias === 'NEUTRAL') {
    components.funding = fundingBias === direction ? 10 : 5;
  } else {
    components.funding = -5; // opposing funding penalised
  }

  // 6. BB compression (0–10 pts) — compressed = good for range, expanding = good for breakout
  components.volatility = bbWidth < 0.02 ? 10 : bbWidth < 0.04 ? 6 : bbWidth < 0.06 ? 3 : 0;

  // 7. Liquidity proximity bonus (0–10 pts)
  // liquidityDistance: how far price is from nearest liquidity wall as % of price
  if (liquidityDistance != null) {
    components.liquidity = liquidityDistance < 0.005 ? 10 : liquidityDistance < 0.01 ? 6 : liquidityDistance < 0.02 ? 3 : 0;
  } else {
    components.liquidity = 3; // neutral when unknown
  }

  const raw   = Object.values(components).reduce((a, b) => a + b, 0);
  const score = Math.max(0, Math.min(100, raw));
  const pass  = score >= minScore;

  log.debug(`[AI] ${direction} score=${score} | ${JSON.stringify(components)}`);

  return { score, components, pass };
}

module.exports = { scoreSignal };
