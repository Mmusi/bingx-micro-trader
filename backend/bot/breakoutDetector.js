// bot/breakoutDetector.js — Breakout / breakdown detection

const { ATR } = require('technicalindicators');

/**
 * Detect breakout from a known range
 * @returns { breakout, direction:'LONG'|'SHORT'|null, strength, volumeSpike }
 */
function detectBreakout(candles, support, resistance) {
  if (!candles.length || support == null || resistance == null) {
    return { breakout: false, direction: null };
  }

  const last   = candles[candles.length - 1];
  const prev   = candles[candles.length - 2] || last;
  const highs  = candles.map(c => c.high);
  const lows   = candles.map(c => c.low);
  const closes = candles.map(c => c.close);

  // ATR for expansion check
  const atrResult = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
  const atr  = atrResult[atrResult.length - 1] || 0;
  const prevAtr = atrResult[atrResult.length - 2] || atr;
  const atrExpanding = atr > prevAtr * 1.1;

  // Volume spike
  const avgVolume = average(candles.slice(-20).map(c => c.volume));
  const volumeSpike = last.volume > avgVolume * 1.5;

  // Candle close outside range
  const bullBreak = last.close > resistance * 1.002 && prev.close <= resistance * 1.002;
  const bearBreak = last.close < support  * 0.998 && prev.close >= support  * 0.998;

  if (bullBreak && (volumeSpike || atrExpanding)) {
    const strength = calcStrength(last, resistance, atr, volumeSpike);
    return { breakout: true, direction: 'LONG',  strength, volumeSpike, atrExpanding };
  }
  if (bearBreak && (volumeSpike || atrExpanding)) {
    const strength = calcStrength(last, support, atr, volumeSpike);
    return { breakout: true, direction: 'SHORT', strength, volumeSpike, atrExpanding };
  }

  return { breakout: false, direction: null };
}

function calcStrength(candle, level, atr, volumeSpike) {
  const dist    = Math.abs(candle.close - level);
  const atrRatio = atr > 0 ? dist / atr : 0;
  let score     = Math.min(atrRatio * 50, 80);
  if (volumeSpike) score += 20;
  return Math.round(Math.min(score, 100));
}

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
}

module.exports = { detectBreakout };
