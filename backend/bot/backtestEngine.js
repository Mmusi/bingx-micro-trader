// bot/backtestEngine.js — Runs strategy simulation on historical candles

const marketData   = require('../exchange/marketData');
const rangeDetector = require('./rangeDetector');
const breakoutDetector = require('./breakoutDetector');
const signalEngine = require('./signalEngine');
const cfg          = require('../config/settings');
const log          = require('../utils/logger');

let lastResult  = null;
let isRunning   = false;
let scheduledAt = null;

/**
 * Run backtest on a single pair for N days
 */
async function runBacktest(symbol = 'BTC-USDT', days = cfg.BACKTEST_DAYS) {
  if (isRunning) return { error: 'Backtest already running' };
  isRunning = true;
  log.info(`[Backtest] Starting ${symbol} ${days}d backtest…`);

  try {
    // Fetch ~200 candles per timeframe request, simulate on 1h candles
    const candles = await marketData.getCandles(symbol, '1h', Math.min(days * 24, 500));
    if (!candles || candles.length < 30) {
      isRunning = false;
      return { error: 'Not enough candle data' };
    }

    let balance    = cfg.STARTING_CAPITAL;
    let trades     = [];
    let wins = 0, losses = 0;
    let maxBalance = balance;
    let maxDrawdown = 0;

    // Walk-forward simulation: use candles[0..i] to decide at candle[i]
    for (let i = 30; i < candles.length - 1; i++) {
      const window = candles.slice(0, i + 1);
      const range  = rangeDetector.detectRange(window);
      const signal = signalEngine.generateSignal(window, range);
      if (!signal.signal) continue;

      const entry      = candles[i].close;
      const stopDist   = entry * cfg.TRAILING_STOP_PCT;
      const stopPrice  = signal.signal === 'LONG' ? entry - stopDist : entry + stopDist;

      // Simulate: look forward up to 24 candles for exit
      let exitPrice = null;
      let exitReason = 'TIMEOUT';
      for (let j = i + 1; j < Math.min(i + 25, candles.length); j++) {
        const c = candles[j];
        if (signal.signal === 'LONG'  && c.low  <= stopPrice) { exitPrice = stopPrice; exitReason = 'STOP'; break; }
        if (signal.signal === 'SHORT' && c.high >= stopPrice) { exitPrice = stopPrice; exitReason = 'STOP'; break; }
        // Trailing: if 5% profit, trail
        const prof = signal.signal === 'LONG'
          ? (c.close - entry) / entry
          : (entry - c.close) / entry;
        if (prof >= 0.05) {
          exitPrice  = c.close;
          exitReason = 'TRAIL';
          break;
        }
      }
      if (!exitPrice) exitPrice = candles[Math.min(i + 24, candles.length - 1)].close;

      const pnlPct = signal.signal === 'LONG'
        ? (exitPrice - entry) / entry * 100
        : (entry - exitPrice) / entry * 100;

      const leverage  = 10; // assume 10x for simulation
      const notional  = balance * cfg.POSITION_ALLOCATION * leverage;
      const pnlUsd    = (pnlPct / 100) * notional;
      balance        += pnlUsd;

      if (balance > maxBalance) maxBalance = balance;
      const dd = (maxBalance - balance) / maxBalance * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;

      if (pnlPct > 0) wins++; else losses++;

      trades.push({
        i, symbol, direction: signal.signal, entry: +entry.toFixed(2),
        exit: +exitPrice.toFixed(2), pnlPct: +pnlPct.toFixed(2), reason: exitReason,
      });
    }

    const total      = wins + losses;
    const winRate    = total > 0 ? ((wins / total) * 100).toFixed(1) : '0';
    const totalGain  = ((balance - cfg.STARTING_CAPITAL) / cfg.STARTING_CAPITAL * 100).toFixed(2);
    const profFactor = losses > 0
      ? (trades.filter(t=>t.pnlPct>0).reduce((s,t)=>s+t.pnlPct,0) /
         Math.abs(trades.filter(t=>t.pnlPct<0).reduce((s,t)=>s+t.pnlPct,0))).toFixed(2)
      : 'N/A';

    lastResult = {
      symbol, days, runAt: new Date().toISOString(),
      trades: trades.length, wins, losses,
      winRate: `${winRate}%`,
      profitFactor: profFactor,
      maxDrawdown:  `${maxDrawdown.toFixed(2)}%`,
      totalGain:    `${totalGain}%`,
      finalBalance: `$${balance.toFixed(4)}`,
      recentTrades: trades.slice(-10),
    };

    log.info(`[Backtest] Done: ${trades.length} trades, WR ${winRate}%, PF ${profFactor}, DD ${maxDrawdown.toFixed(2)}%`);
    isRunning = false;
    return lastResult;
  } catch (err) {
    log.error('[Backtest] Error:', err.message);
    isRunning  = false;
    return { error: err.message };
  }
}

function getLastResult() { return lastResult; }
function getStatus()     { return { isRunning, scheduledAt, lastResult }; }

// ── Auto-scheduler at configured hour (default 2 AM) ─────────
function startScheduler() {
  setInterval(() => {
    const h = new Date().getHours();
    const m = new Date().getMinutes();
    if (h === cfg.BACKTEST_HOUR && m === 0 && !isRunning) {
      scheduledAt = new Date().toISOString();
      log.info('[Backtest] Auto-running scheduled backtest…');
      const pairs = Object.entries(cfg.PAIRS).filter(([,v])=>v.enabled).map(([k])=>k);
      Promise.all(pairs.map(p => runBacktest(p, cfg.BACKTEST_DAYS))).catch(()=>{});
    }
  }, 60_000); // check every minute
}

module.exports = { runBacktest, getLastResult, getStatus, startScheduler };
