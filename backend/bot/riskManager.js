// bot/riskManager.js — Daily loss guard, daily profit target, position sizing

const cfg = require('../config/settings');
const log = require('../utils/logger');

let dailyStartBalance  = null;
let dailyProfit        = 0;
let dailyLoss          = 0;
let dailyDate          = null;
let profitTargetPaused = false;   // paused because profit target hit
let totalTraded        = 0;       // sum of notional traded today

function resetDaily(balance) {
  const today = new Date().toDateString();
  if (dailyDate !== today) {
    dailyDate          = today;
    dailyStartBalance  = balance;
    dailyProfit        = 0;
    dailyLoss          = 0;
    totalTraded        = 0;
    profitTargetPaused = false;
    log.info(`[Risk] New day — start balance $${balance.toFixed(4)}`);
  }
}

function recordTrade(pnlPct, notional) {
  const pnlUsd = (pnlPct / 100) * notional;
  if (pnlUsd > 0) dailyProfit += pnlUsd;
  else             dailyLoss   += Math.abs(pnlUsd);
  totalTraded += notional;

  // Check if daily profit target reached
  if (dailyStartBalance && !profitTargetPaused) {
    const profitRatio = dailyProfit / dailyStartBalance;
    if (profitRatio >= cfg.DAILY_PROFIT_TARGET_PCT) {
      profitTargetPaused = true;
      log.info(`[Risk] 🎯 Daily profit target ${(cfg.DAILY_PROFIT_TARGET_PCT*100).toFixed(0)}% reached — pausing new entries`);
    }
  }
}

function isDailyLossLimitHit(balance) {
  if (!dailyStartBalance) return false;
  return (dailyStartBalance - balance) / dailyStartBalance >= cfg.MAX_DAILY_LOSS_PCT;
}

function isProfitTargetPaused() { return profitTargetPaused; }

/**
 * canTrade — normal entry check
 * canTradeBreakout — bypasses profit-target pause for high-score breakouts only
 */
function canTrade(balance) {
  resetDaily(balance);
  if (isDailyLossLimitHit(balance)) {
    log.warn('[Risk] ❌ Daily loss limit reached — trading paused');
    return false;
  }
  if (profitTargetPaused) {
    log.info('[Risk] 🎯 Profit target reached — normal entries blocked');
    return false;
  }
  return true;
}

function canTradeBreakout(balance, aiScore) {
  resetDaily(balance);
  if (isDailyLossLimitHit(balance)) return false;
  if (!cfg.BREAKOUT_OVERRIDE_ACTIVE)  return false;
  if (aiScore < cfg.BREAKOUT_OVERRIDE_SCORE) {
    log.info(`[Risk] Breakout score ${aiScore} below threshold ${cfg.BREAKOUT_OVERRIDE_SCORE} — skipped`);
    return false;
  }
  log.info(`[Risk] ⚡ Breakout override APPROVED — score ${aiScore} (profit target pause bypassed)`);
  return true;
}

function calcQuantity(balance, price, leverage, minQty = 0.001) {
  const notional = balance * cfg.POSITION_ALLOCATION * leverage;
  const raw      = notional / price;
  return Math.max(Math.floor(raw * 1000) / 1000, minQty);
}

function getDailyStats() {
  return {
    dailyLoss,
    dailyProfit,
    dailyStartBalance,
    dailyDate,
    totalTraded,
    profitTargetPaused,
    profitTargetPct: dailyStartBalance
      ? ((dailyProfit / dailyStartBalance) * 100).toFixed(2)
      : '0.00',
    lossTargetPct: dailyStartBalance
      ? (((dailyStartBalance - (dailyStartBalance - dailyLoss)) / dailyStartBalance) * 100).toFixed(2)
      : '0.00',
  };
}

function manualResumeProfitTarget() {
  profitTargetPaused = false;
  log.info('[Risk] Profit target pause manually cleared');
}

module.exports = {
  canTrade, canTradeBreakout, calcQuantity,
  recordTrade, getDailyStats, resetDaily,
  isProfitTargetPaused, manualResumeProfitTarget,
};
