// bot/liquidityHeatmapEngine.js — Orderbook cluster detection

const bingx = require('../exchange/bingxClient');
const log   = require('../utils/logger');

const cache = {};  // symbol → { walls, updatedAt }

/**
 * Fetch orderbook and identify liquidity walls (large clusters)
 * Returns { bids: [{price, size, isWall}], asks: [...], nearestWall, wallDistance }
 */
async function analyseLiquidity(symbol, currentPrice) {
  try {
    const book = await bingx.getOrderBook(symbol, 50);
    const bids = Array.isArray(book?.bids) ? book.bids : (book?.bid || []);
    const asks = Array.isArray(book?.asks) ? book.asks : (book?.ask || []);

    const parsedBids = bids.map(b => ({ price: parseFloat(b[0]||b.price), size: parseFloat(b[1]||b.size) })).filter(b => b.price && b.size);
    const parsedAsks = asks.map(a => ({ price: parseFloat(a[0]||a.price), size: parseFloat(a[1]||a.size) })).filter(a => a.price && a.size);

    const avgBidSize = parsedBids.reduce((s, b) => s + b.size, 0) / (parsedBids.length || 1);
    const avgAskSize = parsedAsks.reduce((s, a) => s + a.size, 0) / (parsedAsks.length || 1);

    const WALL_MULT = 3; // a wall is 3x average size
    const bidWalls  = parsedBids.filter(b => b.size > avgBidSize * WALL_MULT);
    const askWalls  = parsedAsks.filter(a => a.size > avgAskSize * WALL_MULT);

    const allWalls  = [
      ...bidWalls.map(w => ({ ...w, side: 'BID' })),
      ...askWalls.map(w => ({ ...w, side: 'ASK' })),
    ].sort((a, b) => Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice));

    const nearestWall    = allWalls[0] || null;
    const wallDistance   = nearestWall ? Math.abs(nearestWall.price - currentPrice) / currentPrice : null;

    const result = { bidWalls, askWalls, nearestWall, wallDistance, parsedBids, parsedAsks };
    cache[symbol] = { ...result, updatedAt: Date.now() };
    return result;
  } catch (err) {
    log.warn(`[Liquidity] ${symbol}: ${err.message}`);
    return cache[symbol] || { bidWalls: [], askWalls: [], nearestWall: null, wallDistance: null };
  }
}

function getCached(symbol) { return cache[symbol] || null; }

module.exports = { analyseLiquidity, getCached };
