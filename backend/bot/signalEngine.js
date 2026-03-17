// bot/signalEngine.js — RSI + candlestick pattern confirmation

const { RSI, EMA } = require('technicalindicators');
const cfg = require('../config/settings');

/**
 * Generate confirmed LONG/SHORT signal
 * @returns { signal:'LONG'|'SHORT'|null, strength, rsi, pattern }
 */
function generateSignal(candles, rangeData) {
  if (candles.length < 30) return { signal: null };

  const closes = candles.map(c => c.close);
  const last   = candles[candles.length - 1];

  // RSI
  const rsiValues = RSI.calculate({ values: closes, period: 14 });
  const rsi       = rsiValues[rsiValues.length - 1] || 50;

  // EMA trend
  const ema20 = EMA.calculate({ values: closes, period: 20 });
  const ema50 = EMA.calculate({ values: closes, period: 50 });
  const emaUp = ema20[ema20.length - 1] > ema50[ema50.length - 1];

  // Candlestick patterns
  const pattern = detectPattern(candles.slice(-4));

  // ── LONG confirmation ──────────────────────────────────────
  if (rangeData?.inRange && rangeData.support) {
    const nearSupport = last.close < rangeData.support * 1.01;
    const longConf    = nearSupport && rsi < cfg.RSI_OVERSOLD && (pattern === 'BULLISH' || emaUp);
    if (longConf) {
      const strength = calcStrength(rsi, cfg.RSI_OVERSOLD, pattern, nearSupport);
      return { signal: 'LONG', strength, rsi, pattern };
    }
  }

  // ── SHORT confirmation ─────────────────────────────────────
  if (rangeData?.inRange && rangeData.resistance) {
    const nearResistance = last.close > rangeData.resistance * 0.99;
    const shortConf      = nearResistance && rsi > cfg.RSI_OVERBOUGHT && (pattern === 'BEARISH' || !emaUp);
    if (shortConf) {
      const strength = calcStrength(100 - rsi, 100 - cfg.RSI_OVERBOUGHT, pattern, nearResistance);
      return { signal: 'SHORT', strength, rsi, pattern };
    }
  }

  return { signal: null, rsi, pattern };
}

/**
 * Detect candlestick pattern from last 4 candles
 * @returns 'BULLISH' | 'BEARISH' | 'NEUTRAL'
 */
function detectPattern(candles) {
  if (candles.length < 2) return 'NEUTRAL';
  const [c2, c1, c0] = candles.slice(-3);
  if (!c2 || !c1 || !c0) return 'NEUTRAL';

  const body0  = Math.abs(c0.close - c0.open);
  const range0 = c0.high - c0.low;
  const lowerWick0 = (Math.min(c0.open, c0.close) - c0.low)  / (range0 || 1);
  const upperWick0 = (c0.high - Math.max(c0.open, c0.close)) / (range0 || 1);

  // Bullish engulfing
  if (c1.close < c1.open && c0.close > c0.open &&
      c0.open <= c1.close && c0.close >= c1.open) return 'BULLISH';

  // Bearish engulfing
  if (c1.close > c1.open && c0.close < c0.open &&
      c0.open >= c1.close && c0.close <= c1.open) return 'BEARISH';

  // Bullish pin bar
  if (lowerWick0 > 0.6 && c0.close > c0.open) return 'BULLISH';

  // Bearish pin bar
  if (upperWick0 > 0.6 && c0.close < c0.open) return 'BEARISH';

  // Doji
  if (body0 / (range0 || 1) < 0.1) return 'NEUTRAL';

  // Trend based
  return c0.close > c0.open ? 'BULLISH' : 'BEARISH';
}

function calcStrength(rsiDist, threshold, pattern, nearLevel) {
  let score = Math.min((rsiDist / threshold) * 60, 60);
  if (pattern !== 'NEUTRAL') score += 20;
  if (nearLevel)             score += 20;
  return Math.round(Math.min(score, 100));
}

module.exports = { generateSignal, detectPattern };
