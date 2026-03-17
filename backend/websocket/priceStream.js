// websocket/priceStream.js — BingX WebSocket market data stream

const WebSocket = require('ws');
const zlib      = require('zlib');
const log       = require('../utils/logger');
const cfg       = require('../config/settings');

const WS_URL = 'wss://open-api-swap.bingx.com/swap-market';

class PriceStream {
  constructor() {
    this.ws           = null;
    this.subscribers  = new Map(); // symbol → [callbacks]
    this.priceCache   = new Map(); // symbol → price
    this.connected    = false;
    this.reconnectTimer = null;
  }

  subscribe(symbol, callback) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, []);
    }
    this.subscribers.get(symbol).push(callback);
    if (this.connected) this._subSymbol(symbol);
  }

  unsubscribe(symbol, callback) {
    const cbs = this.subscribers.get(symbol) || [];
    const idx = cbs.indexOf(callback);
    if (idx > -1) cbs.splice(idx, 1);
  }

  getPrice(symbol) {
    return this.priceCache.get(symbol) || null;
  }

  connect() {
    if (this.ws) return;
    log.info('[WS] Connecting to BingX WebSocket...');
    this.ws = new WebSocket(WS_URL);

    this.ws.on('open', () => {
      this.connected = true;
      log.info('[WS] Connected');
      // Re-subscribe all known symbols
      for (const symbol of this.subscribers.keys()) {
        this._subSymbol(symbol);
      }
    });

    this.ws.on('message', (data) => this._handleMessage(data));

    this.ws.on('close', () => {
      this.connected = false;
      this.ws = null;
      log.warn('[WS] Disconnected — reconnecting in 5s...');
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    });

    this.ws.on('error', (err) => {
      log.error('[WS] Error:', err.message);
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    clearTimeout(this.reconnectTimer);
    this.connected = false;
  }

  _subSymbol(symbol) {
    // BingX format: BTC-USDT → BTCUSDT
    const market = symbol.replace('-', '');
    const msg = JSON.stringify({
      id:     `sub-${symbol}`,
      reqType: 'sub',
      dataType: `${market}@trade`,
    });
    this._send(msg);

    // Also subscribe to mark price
    const tickMsg = JSON.stringify({
      id:     `tick-${symbol}`,
      reqType: 'sub',
      dataType: `${market}@lastPrice`,
    });
    this._send(tickMsg);
  }

  _send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    }
  }

  _handleMessage(raw) {
    // BingX sends gzip-compressed data
    try {
      const decompressed = zlib.gunzipSync(Buffer.isBuffer(raw) ? raw : Buffer.from(raw));
      const text = decompressed.toString('utf8');

      // Ping/pong
      if (text === 'Ping') {
        this._send('Pong');
        return;
      }

      const msg = JSON.parse(text);

      // Heartbeat
      if (msg.ping) {
        this._send(JSON.stringify({ pong: msg.ping }));
        return;
      }

      if (!msg.dataType || !msg.data) return;

      // Parse symbol from dataType  e.g. "BTCUSDT@trade"
      const [marketRaw] = msg.dataType.split('@');
      // Convert BTCUSDT → BTC-USDT  (crude but works for listed pairs)
      const symbol = findSymbol(marketRaw);
      if (!symbol) return;

      const price = parseFloat(msg.data?.p || msg.data?.c || msg.data?.price || 0);
      if (!price) return;

      this.priceCache.set(symbol, price);

      // Notify subscribers
      const callbacks = this.subscribers.get(symbol) || [];
      for (const cb of callbacks) {
        try { cb({ symbol, price, data: msg.data }); } catch (_) {}
      }
    } catch (err) {
      // Non-gzip frames (plain text pings)
      try {
        const text = raw.toString();
        if (text === 'Ping') this._send('Pong');
      } catch (_) {}
    }
  }
}

// Map "BTCUSDT" → "BTC-USDT" for known pairs
const KNOWN = Object.keys(cfg.PAIRS);
function findSymbol(raw) {
  return KNOWN.find(p => p.replace('-', '') === raw) || null;
}

module.exports = new PriceStream();
