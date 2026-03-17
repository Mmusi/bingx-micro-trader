// exchange/fundingRates.js — Funding rate cache & bias helper

const { getFundingRate } = require('./marketData');

const rateCache = {};

async function refreshAll(pairs) {
  for (const pair of pairs) {
    try {
      rateCache[pair] = await getFundingRate(pair);
    } catch (_) { /* ignore */ }
  }
}

function getRate(pair) { return rateCache[pair] ?? 0; }

/**
 * Returns 'LONG' | 'SHORT' | 'NEUTRAL'
 * Positive funding → longs pay → SHORT preferred
 * Negative funding → shorts pay → LONG preferred
 */
function getBias(pair) {
  const r = getRate(pair);
  if (r >  0.0001) return 'SHORT';
  if (r < -0.0001) return 'LONG';
  return 'NEUTRAL';
}

module.exports = { refreshAll, getRate, getBias };
