// bot/rangeDetector.js — ATR compression, support/resistance, range detection

const { BollingerBands, ATR } = require('technicalindicators');

/**
 * Detect if market is in a range and identify S/R levels
 * @returns { inRange, support, resistance, rangeHeight, compressed }
 */
function detectRange(candles) {
  if (candles.length < 30) return { inRange: false };

  const highs  = candles.map(c => c.high);
  const lows   = candles.map(c => c.low);
  const closes = candles.map(c => c.close);

  // ATR
  const atrResult = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
  const atr = atrResult[atrResult.length - 1] || 0;
  const currentPrice = closes[closes.length - 1];
  const volatility   = atr / currentPrice;

  // Bollinger Bands squeeze
  const bbResult = BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });
  const bb = bbResult[bbResult.length - 1];
  const bbWidth = bb ? (bb.upper - bb.lower) / bb.middle : 999;
  const compressed = bbWidth < 0.04; // tight squeeze

  // Find swing highs/lows over last 50 candles
  const window = candles.slice(-50);
  const pivotHighs = [];
  const pivotLows  = [];

  for (let i = 2; i < window.length - 2; i++) {
    if (window[i].high > window[i-1].high && window[i].high > window[i-2].high &&
        window[i].high > window[i+1].high && window[i].high > window[i+2].high) {
      pivotHighs.push(window[i].high);
    }
    if (window[i].low < window[i-1].low && window[i].low < window[i-2].low &&
        window[i].low < window[i+1].low && window[i].low < window[i+2].low) {
      pivotLows.push(window[i].low);
    }
  }

  if (pivotHighs.length < 1 || pivotLows.length < 1) {
    return { inRange: false, atr, volatility };
  }

  const resistance = average(pivotHighs.slice(-3));
  const support    = average(pivotLows.slice(-3));
  const rangeHeight = resistance - support;

  // In range if price within bounds and low volatility
  const priceInRange = currentPrice > support * 0.995 && currentPrice < resistance * 1.005;
  const inRange = priceInRange && volatility < 0.007;

  return { inRange, support, resistance, rangeHeight, atr, volatility, compressed, bbWidth };
}

function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

module.exports = { detectRange };
