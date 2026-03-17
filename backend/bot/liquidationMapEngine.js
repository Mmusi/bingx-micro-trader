// bot/liquidationMapEngine.js — Estimates liquidation cluster zones

const log = require('../utils/logger');

/**
 * Estimate liquidation zones based on current price and leverage distribution.
 * In real markets, liquidation clusters form near:
 *   - Recent swing highs/lows (where stops cluster)
 *   - Round numbers
 *   - ATR multiples from current price
 *
 * Returns { longLiqZones, shortLiqZones, nearestLongLiq, nearestShortLiq }
 */
function calcLiquidationMap(candles, currentPrice, leverage = 10) {
  try {
    if (!candles || candles.length < 20) return defaultMap(currentPrice);

    const highs  = candles.slice(-50).map(c => c.high);
    const lows   = candles.slice(-50).map(c => c.low);
    const closes = candles.slice(-50).map(c => c.close);

    // ATR for zone width
    let atr = 0;
    for (let i = 1; i < closes.length; i++) {
      atr += Math.abs(closes[i] - closes[i - 1]);
    }
    atr /= closes.length - 1;

    // Long liquidation zones: below price (longs get liquidated on drops)
    // Typical 10x long gets liquidated at ~9% below entry
    const liqDistances = [1/10, 1/15, 1/20].map(d => d * 0.9); // 10x, 15x, 20x approx
    const longLiqZones  = liqDistances.map(d => ({
      price: +(currentPrice * (1 - d)).toFixed(2),
      strength: d < 0.06 ? 'HIGH' : d < 0.08 ? 'MEDIUM' : 'LOW',
      leverage: Math.round(1 / d / 0.9),
    }));

    // Short liquidation zones: above price
    const shortLiqZones = liqDistances.map(d => ({
      price: +(currentPrice * (1 + d)).toFixed(2),
      strength: d < 0.06 ? 'HIGH' : d < 0.08 ? 'MEDIUM' : 'LOW',
      leverage: Math.round(1 / d / 0.9),
    }));

    // Also add swing high/low based zones
    const swingHigh = Math.max(...highs);
    const swingLow  = Math.min(...lows);
    shortLiqZones.push({ price: +swingHigh.toFixed(2), strength: 'SWING', leverage: null });
    longLiqZones.push(  { price: +swingLow.toFixed(2),  strength: 'SWING', leverage: null });

    // Sort by proximity to current price
    shortLiqZones.sort((a, b) => a.price - b.price);
    longLiqZones.sort((a, b) => b.price - a.price);

    return {
      longLiqZones,
      shortLiqZones,
      nearestLongLiq:  longLiqZones[0]  || null,
      nearestShortLiq: shortLiqZones[0] || null,
      atr,
    };
  } catch (err) {
    log.warn('[LiqMap] Error:', err.message);
    return defaultMap(currentPrice);
  }
}

function defaultMap(price) {
  return {
    longLiqZones:    [{ price: +(price * 0.91).toFixed(2), strength: 'EST', leverage: 10 }],
    shortLiqZones:   [{ price: +(price * 1.09).toFixed(2), strength: 'EST', leverage: 10 }],
    nearestLongLiq:  { price: +(price * 0.91).toFixed(2), strength: 'EST', leverage: 10 },
    nearestShortLiq: { price: +(price * 1.09).toFixed(2), strength: 'EST', leverage: 10 },
    atr: 0,
  };
}

module.exports = { calcLiquidationMap };
