// bot/mtfEngine.js — Multi-Timeframe Engine
// Uses 1H candles for direction, 5m candles for entry timing.
// Only enters trades WITH the higher timeframe trend.
// Does NOT modify any existing strategy logic.

const { EMA } = require('technicalindicators');
const log = require('../utils/logger');

/**
 * Determine the higher-timeframe (1H) trend direction.
 * Returns 'LONG' | 'SHORT' | 'NEUTRAL'
 */
function getHTFTrend(candles1h) {
  if (!candles1h || candles1h.length < 50) return 'NEUTRAL';

  const closes = candles1h.map(c => c.close);
  const ema20  = EMA.calculate({ values: closes, period: 20 });
  const ema50  = EMA.calculate({ values: closes, period: 50 });

  if (!ema20.length || !ema50.length) return 'NEUTRAL';

  const e20 = ema20[ema20.length - 1];
  const e50 = ema50[ema50.length - 1];

  // Also check slope of EMA20 over last 3 candles
  const e20_3ago = ema20.length >= 3 ? ema20[ema20.length - 3] : e20;
  const slope = (e20 - e20_3ago) / e20_3ago;

  if (e20 > e50 && slope > 0.0005)  return 'LONG';
  if (e20 < e50 && slope < -0.0005) return 'SHORT';
  return 'NEUTRAL';
}

/**
 * Check if a 5m scalp signal aligns with the 1H trend.
 * Returns { aligned, htfTrend, reason }
 */
function checkMTFAlignment(signal5m, candles1h) {
  const htfTrend = getHTFTrend(candles1h);

  if (htfTrend === 'NEUTRAL') {
    // Neutral HTF — allow both directions but flag it
    return {
      aligned:  true,
      htfTrend: 'NEUTRAL',
      reason:   'HTF neutral — scalp allowed without trend filter',
    };
  }

  const aligned = signal5m === htfTrend;
  log.debug(`[MTF] 5m=${signal5m} HTF=${htfTrend} aligned=${aligned}`);

  return {
    aligned,
    htfTrend,
    reason: aligned
      ? `5m ${signal5m} aligns with 1H ${htfTrend} trend`
      : `5m ${signal5m} opposes 1H ${htfTrend} trend — BLOCKED`,
  };
}

module.exports = { getHTFTrend, checkMTFAlignment };
