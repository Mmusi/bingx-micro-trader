// exchange/bingxClient.js — BingX REST API client

const axios  = require('axios');
const crypto = require('crypto');
const cfg    = require('../config/settings');
const log    = require('../utils/logger');

const BASE = 'https://open-api.bingx.com';

function sign(params) {
  const qs  = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  const sig = crypto.createHmac('sha256', cfg.BINGX_API_SECRET).update(qs).digest('hex');
  return { ...params, signature: sig };
}

async function request(method, path, params = {}, auth = false) {
  try {
    const ts = Date.now();
    let p    = auth ? { ...params, timestamp: ts } : params;
    if (auth) p = sign(p);

    const headers = auth ? { 'X-BX-APIKEY': cfg.BINGX_API_KEY } : {};
    const url     = `${BASE}${path}`;

    const res = method === 'GET'
      ? await axios.get(url,  { params: p, headers, timeout: 10000 })
      : await axios.post(url, null, { params: p, headers, timeout: 10000 });

    // BingX returns code:0 for success, non-zero for error
    if (res.data && res.data.code !== undefined && res.data.code !== 0) {
      throw new Error(`BingX error ${res.data.code}: ${res.data.msg}`);
    }
    return res.data.data !== undefined ? res.data.data : res.data;
  } catch (err) {
    log.error(`[BingX] ${method} ${path} → ${err.message}`);
    throw err;
  }
}

// ── Market Data ───────────────────────────────────────────────

// BingX klines: try v3 then v2 endpoint, handle both array and object responses
async function getKlines(symbol, interval, limit = 100) {
  const endpoints = [
    '/openApi/swap/v3/quote/klines',
    '/openApi/swap/v2/quote/klines',
  ];
  let lastErr;
  for (const ep of endpoints) {
    try {
      const raw = await request('GET', ep, { symbol, interval, limit });
      // raw may be: array of arrays, array of objects, or { data: [...] }
      const arr = Array.isArray(raw) ? raw
                : Array.isArray(raw?.data) ? raw.data
                : null;
      if (arr && arr.length > 0) {
        log.info(`[BingX] klines OK via ${ep} (${arr.length} candles)`);
        return arr;
      }
    } catch (e) {
      lastErr = e;
      log.warn(`[BingX] klines ${ep} failed: ${e.message}`);
    }
  }
  throw lastErr || new Error('No kline data returned');
}

async function getTicker(symbol) {
  return request('GET', '/openApi/swap/v2/quote/ticker', { symbol });
}

async function getOrderBook(symbol, limit = 20) {
  return request('GET', '/openApi/swap/v2/quote/depth', { symbol, limit });
}

async function getFundingRate(symbol) {
  return request('GET', '/openApi/swap/v2/quote/premiumIndex', { symbol });
}

async function getMarkPrice(symbol) {
  return request('GET', '/openApi/swap/v2/quote/premiumIndex', { symbol });
}

// ── Account ───────────────────────────────────────────────────
async function getBalance() {
  return request('GET', '/openApi/swap/v2/user/balance', {}, true);
}

async function getPositions(symbol) {
  const p = symbol ? { symbol } : {};
  return request('GET', '/openApi/swap/v2/user/positions', p, true);
}

async function getOpenOrders(symbol) {
  return request('GET', '/openApi/swap/v2/trade/openOrders', { symbol }, true);
}

// ── Trading ───────────────────────────────────────────────────
async function setLeverage(symbol, leverage, positionSide = 'BOTH') {
  return request('POST', '/openApi/swap/v2/trade/leverage', {
    symbol, leverage, side: positionSide
  }, true);
}

async function setMarginType(symbol, marginType = 'ISOLATED') {
  return request('POST', '/openApi/swap/v2/trade/marginType', {
    symbol, marginType
  }, true);
}

async function placeOrder({ symbol, side, positionSide, type, quantity, price, stopPrice, stopLoss, takeProfit }) {
  const params = {
    symbol, side, positionSide, type,
    quantity: String(quantity),
  };
  if (price)      params.price      = String(price);
  if (stopPrice)  params.stopPrice  = String(stopPrice);
  if (stopLoss)   params.stopLoss   = String(stopLoss);
  if (takeProfit) params.takeProfit = String(takeProfit);
  return request('POST', '/openApi/swap/v2/trade/order', params, true);
}

async function cancelOrder(symbol, orderId) {
  return request('POST', '/openApi/swap/v2/trade/cancel', { symbol, orderId }, true);
}

async function cancelAllOrders(symbol) {
  return request('POST', '/openApi/swap/v2/trade/cancelAllOrders', { symbol }, true);
}

async function closePosition(symbol, positionSide) {
  return request('POST', '/openApi/swap/v2/trade/closePosition', { symbol, positionSide }, true);
}

module.exports = {
  getKlines, getTicker, getOrderBook, getFundingRate, getMarkPrice,
  getBalance, getPositions, getOpenOrders,
  setLeverage, setMarginType, placeOrder, cancelOrder, cancelAllOrders, closePosition,
};
