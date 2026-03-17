// database/sqlite.js — SQLite DB using sql.js (pure JS, no native build needed)

const initSqlJs = require('sql.js');
const path      = require('path');
const fs        = require('fs');
const log       = require('../utils/logger');

const DB_PATH = path.join(__dirname, '../../database/trades.db');

let db = null;

// Persist DB to disk
function saveToDisk() {
  try {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    log.error('[DB] Save error:', err.message);
  }
}

// Auto-save every 10 seconds
let saveTimer = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    log.info(`[DB] Loaded existing DB: ${DB_PATH}`);
  } else {
    db = new SQL.Database();
    log.info(`[DB] Created new DB: ${DB_PATH}`);
  }

  migrate();
  saveToDisk();

  // Periodic save
  if (!saveTimer) {
    saveTimer = setInterval(saveToDisk, 10_000);
  }

  return db;
}

function migrate() {
  db.run(`
    CREATE TABLE IF NOT EXISTS trades (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_id      TEXT,
      pair          TEXT    NOT NULL,
      direction     TEXT    NOT NULL,
      entry_price   REAL    NOT NULL,
      exit_price    REAL,
      quantity      REAL,
      leverage      INTEGER,
      profit        REAL,
      status        TEXT    DEFAULT 'OPEN',
      source        TEXT,
      timestamp     INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS signals (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      pair       TEXT    NOT NULL,
      direction  TEXT    NOT NULL,
      strength   INTEGER,
      source     TEXT,
      status     TEXT    DEFAULT 'PENDING',
      timestamp  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// Helper: run a statement with params
function run(sql, params = []) {
  db.run(sql, params);
  saveToDisk();
}

// Helper: get all rows as array of objects
function all(sql, params = []) {
  try {
    const stmt   = db.prepare(sql);
    const rows   = [];
    stmt.bind(params);
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  } catch (_) {
    return [];
  }
}

// Helper: get single row
function get(sql, params = []) {
  const rows = all(sql, params);
  return rows[0] || null;
}

module.exports = { getDb, run, all, get, saveToDisk };
