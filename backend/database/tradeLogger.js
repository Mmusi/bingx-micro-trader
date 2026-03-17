// database/tradeLogger.js — Trade & signal persistence (sql.js)

const { getDb, run, all, get } = require('./sqlite');
const log = require('../utils/logger');

// Initialise DB on first use
let _ready = false;
async function ensureReady() {
  if (!_ready) { await getDb(); _ready = true; }
}

async function logTrade({ pair, direction, entryPrice, leverage, quantity, status = 'OPEN', source = '' }) {
  try {
    await ensureReady();
    run(
      `INSERT INTO trades (pair, direction, entry_price, leverage, quantity, status, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [pair, direction, entryPrice, leverage, quantity, status, source]
    );
  } catch (err) {
    log.error('[TradeLogger] logTrade error:', err.message);
  }
}

async function updateTrade(tradeId, { exitPrice, profit, status }) {
  try {
    await ensureReady();
    // Match by trade_id or most recent open trade for that symbol
    const symbol = tradeId.split('-').slice(0, 2).join('-');
    run(
      `UPDATE trades SET exit_price=?, profit=?, status=?
       WHERE (trade_id=? OR pair=?) AND status='OPEN'`,
      [exitPrice, profit, status, tradeId, symbol]
    );
  } catch (err) {
    log.error('[TradeLogger] updateTrade error:', err.message);
  }
}

async function getRecentTrades(limit = 50) {
  try {
    await ensureReady();
    return all(`SELECT * FROM trades ORDER BY timestamp DESC LIMIT ?`, [limit]);
  } catch (err) {
    log.error('[TradeLogger] getRecentTrades error:', err.message);
    return [];
  }
}

async function getDailyStats() {
  try {
    await ensureReady();
    const midnight = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
    return get(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN profit > 0 THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN profit < 0 THEN 1 ELSE 0 END) as losses,
        COALESCE(SUM(profit), 0) as total_pnl
       FROM trades WHERE timestamp >= ? AND status='CLOSED'`,
      [midnight]
    ) || {};
  } catch (err) {
    log.error('[TradeLogger] getDailyStats error:', err.message);
    return {};
  }
}

async function logSignal({ pair, direction, strength, source, status = 'PENDING' }) {
  try {
    await ensureReady();
    run(
      `INSERT INTO signals (pair, direction, strength, source, status) VALUES (?,?,?,?,?)`,
      [pair, direction, strength, source, status]
    );
  } catch (err) {
    log.error('[TradeLogger] logSignal error:', err.message);
  }
}

module.exports = { logTrade, updateTrade, getRecentTrades, getDailyStats, logSignal };
