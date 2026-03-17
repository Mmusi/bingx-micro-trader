// bot/microCompoundingEngine.js — Tracks compounding growth and adjusts sizing

const cfg = require('../config/settings');
const log = require('../utils/logger');

let sessionStartBalance = null;
let peakBalance         = null;
const snapshots         = [];   // { time, balance } history for chart

function init(balance) {
  if (!sessionStartBalance) {
    sessionStartBalance = balance;
    peakBalance         = balance;
    log.info(`[Compound] Session start: $${balance.toFixed(4)}`);
  }
}

function update(balance) {
  init(balance);
  if (balance > peakBalance) peakBalance = balance;
  snapshots.push({ time: Date.now(), balance });
  if (snapshots.length > 288) snapshots.shift(); // keep ~24h at 5min intervals
}

/**
 * Dynamic position allocation — increases as balance grows, to compound faster.
 * Base: 40%. For every 50% gain, add 5% (capped at 60%).
 */
function getDynamicAllocation(balance) {
  if (!sessionStartBalance) return cfg.POSITION_ALLOCATION;
  const gain = (balance - sessionStartBalance) / sessionStartBalance;
  const bonus = Math.floor(gain / 0.5) * 0.05;
  return Math.min(cfg.POSITION_ALLOCATION + bonus, 0.60);
}

function getStats(balance) {
  init(balance);
  const totalGainPct = sessionStartBalance > 0
    ? ((balance - sessionStartBalance) / sessionStartBalance * 100).toFixed(2)
    : '0.00';
  const drawdownFromPeak = peakBalance > 0
    ? ((peakBalance - balance) / peakBalance * 100).toFixed(2)
    : '0.00';
  const allocation = getDynamicAllocation(balance);

  return {
    sessionStartBalance,
    peakBalance,
    totalGainPct,
    drawdownFromPeak,
    currentAllocation: +(allocation * 100).toFixed(1),
    snapshots: snapshots.slice(-24), // last 24 data points
  };
}

module.exports = { init, update, getDynamicAllocation, getStats };
