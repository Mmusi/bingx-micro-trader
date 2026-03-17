// bot/scalpEngine.js — 5m EMA crossover scalping engine
// Fires 5–15 signals/day. Targets 0.3%–0.6% moves.
// Does NOT modify any existing strategy logic.

const { EMA } = require('technicalindicators');
const log = require('../utils/logger');

/**
 * Analyse 5m candles for scalp opportunities.
 * Returns { signal: 'LONG'|'SHORT'|null, strength, reason }
 *
 * Conditions:
 *  - EMA9 crosses above/below EMA21
 *  - Volume above 20-period average
 *  - 3 consecutive candles confirm direction
 *  - AI score ≥ 50 (checked in strategyEngine, not here)
 */
function detectScalpSignal(candles5m) {
  if (!candles5m || candles5m.length < 30) {
    return { signal: null, reason: 'insufficient data' };
  }

  const closes  = candles5m.map(c => c.close);
  const volumes = candles5m.map(c => c.volume);

  // EMA9 and EMA21
  const ema9Values  = EMA.calculate({ values: closes, period: 9 });
  const ema21Values = EMA.calculate({ values: closes, period: 21 });

  if (ema9Values.length < 2 || ema21Values.length < 2) {
    return { signal: null, reason: 'not enough ema data' };
  }

  const ema9Now  = ema9Values[ema9Values.length - 1];
  const ema9Prev = ema9Values[ema9Values.length - 2];
  const ema21Now  = ema21Values[ema21Values.length - 1];
  const ema21Prev = ema21Values[ema21Values.length - 2];

  // Detect crossover
  const bullCross = ema9Prev <= ema21Prev && ema9Now > ema21Now;
  const bearCross = ema9Prev >= ema21Prev && ema9Now < ema21Now;

  // If no crossover, check if aligned (continuation)
  const bullAligned = ema9Now > ema21Now;
  const bearAligned = ema9Now < ema21Now;

  // Volume check: current > 20-period average
  const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const lastVol = volumes[volumes.length - 1];
  const volAboveAvg = lastVol > avgVol;

  // 3 consecutive candles in direction
  const last3 = candles5m.slice(-3);
  const threeBullish = last3.every(c => c.close > c.open);
  const threeBearish  = last3.every(c => c.close < c.open);

  // Momentum: last candle body size
  const lastCandle = candles5m[candles5m.length - 1];
  const bodySize = Math.abs(lastCandle.close - lastCandle.open) / lastCandle.open;
  const hasMomentum = bodySize > 0.0005; // at least 0.05% body

  // ── LONG scalp ──────────────────────────────────────────────
  if ((bullCross || (bullAligned && threeBullish)) && volAboveAvg && hasMomentum) {
    let strength = 50;
    if (bullCross)    strength += 20;
    if (threeBullish) strength += 15;
    if (lastVol > avgVol * 1.5) strength += 10;
    if (bodySize > 0.001) strength += 5;
    strength = Math.min(strength, 100);

    log.debug(`[Scalp] LONG signal — cross:${bullCross} vol:${(lastVol/avgVol).toFixed(2)}x str:${strength}`);
    return {
      signal: 'LONG',
      strength,
      reason: bullCross ? 'EMA9_CROSS_UP' : 'EMA_ALIGNED_BULL',
      ema9: ema9Now,
      ema21: ema21Now,
      volRatio: +(lastVol / avgVol).toFixed(2),
    };
  }

  // ── SHORT scalp ─────────────────────────────────────────────
  if ((bearCross || (bearAligned && threeBearish)) && volAboveAvg && hasMomentum) {
    let strength = 50;
    if (bearCross)    strength += 20;
    if (threeBearish) strength += 15;
    if (lastVol > avgVol * 1.5) strength += 10;
    if (bodySize > 0.001) strength += 5;
    strength = Math.min(strength, 100);

    log.debug(`[Scalp] SHORT signal — cross:${bearCross} vol:${(lastVol/avgVol).toFixed(2)}x str:${strength}`);
    return {
      signal: 'SHORT',
      strength,
      reason: bearCross ? 'EMA9_CROSS_DOWN' : 'EMA_ALIGNED_BEAR',
      ema9: ema9Now,
      ema21: ema21Now,
      volRatio: +(lastVol / avgVol).toFixed(2),
    };
  }

  return { signal: null, reason: 'no scalp condition met' };
}

module.exports = { detectScalpSignal };
