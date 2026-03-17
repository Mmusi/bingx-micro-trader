// bot/slotReleaseManager.js — Smart Slot Release Logic
// When both trade slots are full and a high-conviction signal arrives (AI ≥ 85),
// this module checks if the weaker trade can be closed to make room.
// Only applies to BREAKOUT or LIQUIDITY_TRAP signals, never scalps.
// Does NOT modify any existing logic.

const log = require('../utils/logger');

const MIN_AI_SCORE_FOR_RELEASE = 85;   // signal must be this strong
const MIN_PROFIT_TO_RELEASE    = 3.0;  // weaker trade must have ≥3% profit
const ELIGIBLE_SOURCES = ['BREAKOUT', 'LIQUIDITY_TRAP'];

/**
 * Determine if a slot should be released for a high-conviction signal.
 *
 * @param {Object} incomingSignal  - { aiScore, source, direction, symbol, strength }
 * @param {Array}  activeTrades    - array of active trade objects from strategyEngine
 * @returns { shouldRelease: boolean, tradeToClose: Object|null, reason: string }
 */
function checkSlotRelease(incomingSignal, activeTrades) {
  // Only trigger for BREAKOUT or LIQUIDITY_TRAP
  if (!ELIGIBLE_SOURCES.includes(incomingSignal.source)) {
    return {
      shouldRelease: false,
      tradeToClose:  null,
      reason:        `Source ${incomingSignal.source} not eligible for slot release`,
    };
  }

  // Signal must meet high-conviction threshold
  if ((incomingSignal.aiScore || 0) < MIN_AI_SCORE_FOR_RELEASE) {
    return {
      shouldRelease: false,
      tradeToClose:  null,
      reason:        `AI score ${incomingSignal.aiScore} < ${MIN_AI_SCORE_FOR_RELEASE} threshold`,
    };
  }

  // Only acts when all slots full
  if (!activeTrades || activeTrades.length < 2) {
    return {
      shouldRelease: false,
      tradeToClose:  null,
      reason:        'Slots not full — no release needed',
    };
  }

  // Find trades with sufficient profit (trailing stop is protecting them)
  const profitableTrades = activeTrades.filter(
    t => (t.profitPct || 0) >= MIN_PROFIT_TO_RELEASE
  );

  if (profitableTrades.length === 0) {
    return {
      shouldRelease: false,
      tradeToClose:  null,
      reason:        `No trades with ≥${MIN_PROFIT_TO_RELEASE}% profit — NOT closing any trade`,
    };
  }

  // Close the WEAKER (lower PnL) profitable trade to free the slot
  const tradeToClose = profitableTrades.reduce((weakest, t) =>
    (t.profitPct || 0) < (weakest.profitPct || 0) ? t : weakest
  );

  const reason = `SLOT_RELEASE — ${incomingSignal.source} AI:${incomingSignal.aiScore}% displaced ` +
    `${tradeToClose.direction} ${tradeToClose.symbol} (+${(tradeToClose.profitPct || 0).toFixed(2)}%)`;

  log.info(`[SlotRelease] ${reason}`);

  return {
    shouldRelease: true,
    tradeToClose,
    reason,
  };
}

module.exports = { checkSlotRelease, MIN_AI_SCORE_FOR_RELEASE, MIN_PROFIT_TO_RELEASE };
