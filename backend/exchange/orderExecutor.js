// exchange/orderExecutor.js — Order placement & management

const bingx  = require('./bingxClient');
const log    = require('../utils/logger');
const cfg    = require('../config/settings');

/**
 * Place a trade order
 * @param {Object} signal - { symbol, direction:'LONG'|'SHORT', price, quantity, leverage, useMarket }
 */
async function openTrade(signal) {
  const { symbol, direction, price, quantity, leverage, useMarket = false } = signal;

  try {
    // 1. Set leverage
    await bingx.setLeverage(symbol, leverage);

    // 2. Set ISOLATED margin
    try { await bingx.setMarginType(symbol, 'ISOLATED'); } catch (_) { /* already set */ }

    const side         = direction === 'LONG' ? 'BUY' : 'SELL';
    const positionSide = direction; // LONG or SHORT
    const orderType    = useMarket ? 'MARKET' : 'LIMIT';

    const order = await bingx.placeOrder({
      symbol,
      side,
      positionSide,
      type: orderType,
      quantity,
      price: orderType === 'LIMIT' ? price : undefined,
    });

    log.info(`[Executor] Opened ${direction} ${symbol} qty=${quantity} lev=${leverage}x`);
    return order;
  } catch (err) {
    log.error(`[Executor] openTrade failed: ${err.message}`);
    throw err;
  }
}

/**
 * Close a position with a market order
 */
async function closeTrade(symbol, direction, quantity) {
  try {
    const side         = direction === 'LONG' ? 'SELL' : 'BUY';
    const positionSide = direction;

    const order = await bingx.placeOrder({
      symbol, side, positionSide, type: 'MARKET', quantity,
    });

    log.info(`[Executor] Closed ${direction} ${symbol} qty=${quantity}`);
    return order;
  } catch (err) {
    log.error(`[Executor] closeTrade failed: ${err.message}`);
    throw err;
  }
}

/**
 * Place a stop-loss market order
 */
async function placeStopLoss(symbol, direction, quantity, stopPrice) {
  try {
    const side         = direction === 'LONG' ? 'SELL' : 'BUY';
    const positionSide = direction;

    return await bingx.placeOrder({
      symbol, side, positionSide,
      type: 'STOP_MARKET',
      quantity,
      stopPrice,
    });
  } catch (err) {
    log.warn(`[Executor] placeStopLoss failed: ${err.message}`);
  }
}

module.exports = { openTrade, closeTrade, placeStopLoss };
