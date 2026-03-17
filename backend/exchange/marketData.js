// exchange/marketData.js — OHLCV normaliser & cache

const bingx = require('./bingxClient');
const log   = require('../utils/logger');

const cache = {};
const TF_MAP = { '1d':'1d','4h':'4h','1h':'1h','15m':'15m','5m':'5m','1m':'1m' };

function cacheKey(symbol, interval) { return `${symbol}:${interval}`; }

// Normalise any BingX kline format into { time, open, high, low, close, volume }
function normalise(raw) {
  if (!raw || !raw.length) return [];
  const first = raw[0];

  // Format A: array-of-arrays  [ [ts, o, h, l, c, v], ... ]
  if (Array.isArray(first)) {
    return raw.map(c => ({
      time:   Math.floor(Number(c[0]) / 1000),
      open:   parseFloat(c[1]),
      high:   parseFloat(c[2]),
      low:    parseFloat(c[3]),
      close:  parseFloat(c[4]),
      volume: parseFloat(c[5] || 0),
    }));
  }

  // Format B: array-of-objects with numeric keys { 0: ts, 1: o ... }
  if (first['0'] !== undefined) {
    return raw.map(c => ({
      time:   Math.floor(Number(c['0']) / 1000),
      open:   parseFloat(c['1']),
      high:   parseFloat(c['2']),
      low:    parseFloat(c['3']),
      close:  parseFloat(c['4']),
      volume: parseFloat(c['5'] || 0),
    }));
  }

  // Format C: array-of-objects with named keys
  return raw.map(c => ({
    time:   Math.floor(Number(c.time || c.t || c.openTime || c.open_time) / 1000),
    open:   parseFloat(c.open  || c.o),
    high:   parseFloat(c.high  || c.h),
    low:    parseFloat(c.low   || c.l),
    close:  parseFloat(c.close || c.c),
    volume: parseFloat(c.volume || c.v || 0),
  }));
}

async function getCandles(symbol, interval = '1h', limit = 100) {
  try {
    const raw = await bingx.getKlines(symbol, TF_MAP[interval] || interval, limit);
    if (!raw || !raw.length) return cache[cacheKey(symbol, interval)] || [];

    const candles = normalise(raw)
      .filter(c => c.time && c.open && c.high && c.low && c.close)
      .sort((a, b) => a.time - b.time);

    log.info(`[MarketData] ${symbol} ${interval}: ${candles.length} candles, last close $${candles[candles.length-1]?.close}`);
    cache[cacheKey(symbol, interval)] = candles;
    return candles;
  } catch (err) {
    log.error('[MarketData] getCandles error:', err.message);
    return cache[cacheKey(symbol, interval)] || [];
  }
}

async function getTicker(symbol) {
  try {
    const t = await bingx.getTicker(symbol);
    if (Array.isArray(t)) return t[0];
    return t;
  } catch (err) {
    log.error('[MarketData] getTicker error:', err.message);
    return null;
  }
}

async function getFundingRate(symbol) {
  try {
    const d = await bingx.getFundingRate(symbol);
    const r = Array.isArray(d) ? d[0] : d;
    return parseFloat(r?.lastFundingRate || r?.fundingRate || 0);
  } catch (err) {
    log.warn('[MarketData] getFundingRate error:', err.message);
    return 0;
  }
}

function getCached(symbol, interval) {
  return cache[cacheKey(symbol, interval)] || [];
}

module.exports = { getCandles, getTicker, getFundingRate, getCached };
