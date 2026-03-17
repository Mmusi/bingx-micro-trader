// bot/pairBalanceRouter.js — Pair minimum balance routing
// Skips pairs where balance is too low for minimum notional.
// Does NOT modify any existing logic.

const log = require('../utils/logger');

// Minimum balance required per pair (in USDT)
// Based on: balance * 0.40 * leverage >= min notional
// With 10x leverage and 40% allocation: balance >= minNotional / (0.40 * 10)
const PAIR_MIN_BALANCE = {
  'BTC-USDT':  1.50,   // BTC min notional ~$5, 20x: 5/(0.4*20)=0.625, but BTC needs more
  'SOL-USDT':  0.80,
  'AVAX-USDT': 0.50,
  'LINK-USDT': 0.30,
  'SUI-USDT':  0.10,   // viable with $0.10
  'APT-USDT':  0.10,   // viable with $0.10
};

/**
 * Check if balance is sufficient to trade a pair.
 * Returns { allowed: boolean, reason: string, minRequired: number }
 */
function canTradePair(symbol, balance) {
  const minRequired = PAIR_MIN_BALANCE[symbol];

  if (minRequired == null) {
    // Unknown pair — allow by default
    return { allowed: true, reason: 'unknown pair, no min balance set', minRequired: 0 };
  }

  if (balance < minRequired) {
    const reason = `Balance $${balance.toFixed(4)} < min $${minRequired} for ${symbol} — routing to smaller pairs`;
    log.debug(`[PairRouter] ${reason}`);
    return { allowed: false, reason, minRequired };
  }

  return { allowed: true, reason: 'balance sufficient', minRequired };
}

/**
 * Filter a list of pairs to only those viable at current balance.
 * Returns the filtered list (always returns at least SUI/APT if balance > $0.10).
 */
function getViablePairs(allPairs, balance) {
  const viable = allPairs.filter(pair => canTradePair(pair, balance).allowed);
  if (viable.length === 0) {
    log.warn(`[PairRouter] No pairs viable at balance $${balance.toFixed(4)} — minimum is SUI/APT at $0.10`);
  }
  return viable;
}

module.exports = { canTradePair, getViablePairs, PAIR_MIN_BALANCE };
