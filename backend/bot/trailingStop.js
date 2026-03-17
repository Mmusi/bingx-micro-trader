// bot/trailingStop.js — Trailing stop logic

const log = require('../utils/logger');
const cfg = require('../config/settings');

// Map of tradeId → { peakPrice, stopPrice, direction }
const state = {};

function init(tradeId, entryPrice, direction) {
  state[tradeId] = {
    entryPrice,
    direction,
    peakPrice: entryPrice,
    stopPrice: direction === 'LONG'
      ? entryPrice * (1 - cfg.TRAILING_STOP_PCT)
      : entryPrice * (1 + cfg.TRAILING_STOP_PCT),
  };
}

/**
 * Update trailing stop with latest price.
 * Returns { hit: true } if stop was triggered.
 */
function update(tradeId, currentPrice) {
  const t = state[tradeId];
  if (!t) return { hit: false };

  if (t.direction === 'LONG') {
    if (currentPrice > t.peakPrice) {
      t.peakPrice = currentPrice;
      t.stopPrice = currentPrice * (1 - cfg.TRAILING_STOP_PCT);
    }
    if (currentPrice <= t.stopPrice) {
      log.info(`[TrailingStop] LONG ${tradeId} HIT at ${currentPrice} (stop=${t.stopPrice.toFixed(4)})`);
      cleanup(tradeId);
      return { hit: true, exitPrice: currentPrice };
    }
  } else {
    if (currentPrice < t.peakPrice) {
      t.peakPrice = currentPrice;
      t.stopPrice = currentPrice * (1 + cfg.TRAILING_STOP_PCT);
    }
    if (currentPrice >= t.stopPrice) {
      log.info(`[TrailingStop] SHORT ${tradeId} HIT at ${currentPrice} (stop=${t.stopPrice.toFixed(4)})`);
      cleanup(tradeId);
      return { hit: true, exitPrice: currentPrice };
    }
  }

  return {
    hit:       false,
    peakPrice: t.peakPrice,
    stopPrice: t.stopPrice,
    profitPct: t.direction === 'LONG'
      ? ((currentPrice - t.entryPrice) / t.entryPrice) * 100
      : ((t.entryPrice - currentPrice) / t.entryPrice) * 100,
  };
}

function cleanup(tradeId) {
  delete state[tradeId];
}

function getState(tradeId) { return state[tradeId] || null; }

module.exports = { init, update, cleanup, getState };
