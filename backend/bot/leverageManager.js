// bot/leverageManager.js — Dynamic leverage based on ATR volatility

const { ATR } = require('technicalindicators');
const cfg = require('../config/settings');
const log = require('../utils/logger');

/**
 * Calculate dynamic leverage from candle data
 * volatility = ATR / price
 * < 0.003  → 20x
 * 0.003–0.007 → 10x
 * > 0.007  → 5x
 */
function calcLeverage(candles) {
  if (candles.length < 15) return cfg.MIN_LEVERAGE;

  const highs  = candles.map(c => c.high);
  const lows   = candles.map(c => c.low);
  const closes = candles.map(c => c.close);

  const atrResult  = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
  const atr        = atrResult[atrResult.length - 1] || 0;
  const price      = closes[closes.length - 1];
  const volatility = atr / price;

  let leverage;
  if (volatility < cfg.ATR_LOW_VOLATILITY)  leverage = 20;
  else if (volatility < cfg.ATR_HIGH_VOLATILITY) leverage = 10;
  else leverage = 5;

  leverage = Math.min(leverage, cfg.MAX_LEVERAGE);
  leverage = Math.max(leverage, cfg.MIN_LEVERAGE);

  log.debug(`[Leverage] vol=${volatility.toFixed(5)} → ${leverage}x`);
  return leverage;
}

module.exports = { calcLeverage };
