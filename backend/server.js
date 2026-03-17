// server.js — Express API + WebSocket broadcast

const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const WebSocket  = require('ws');

const cfg            = require('./config/settings');
const log            = require('./utils/logger');
const telegram       = require('./utils/telegram');
const strategyEngine = require('./bot/strategyEngine');
const signalQueue    = require('./bot/signalQueue');
const tradeLogger    = require('./database/tradeLogger');
const marketData     = require('./exchange/marketData');
const bingx          = require('./exchange/bingxClient');
const priceStream    = require('./websocket/priceStream');
const backtestEngine = require('./bot/backtestEngine');
const riskManager    = require('./bot/riskManager');
const microCompound  = require('./bot/microCompoundingEngine');

const app    = express();
const server = http.createServer(app);
app.use(cors());
app.use(express.json());

// ── Frontend WebSocket ────────────────────────────────────────
const wss     = new WebSocket.Server({ server, path: '/ws' });
const clients = new Set();
wss.on('connection', ws => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});
function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, ts: Date.now() });
  for (const ws of clients) if (ws.readyState === WebSocket.OPEN) ws.send(msg);
}

// Push status every 2s
setInterval(() => {
  const s = strategyEngine.getStatus();
  if (s && Object.keys(s).length) broadcast('STATUS', s);
}, 2000);

// Push prices from BingX WS
const enabledPairs = Object.entries(cfg.PAIRS).filter(([,v])=>v.enabled).map(([k])=>k);
for (const pair of enabledPairs) {
  priceStream.subscribe(pair, ({ symbol, price }) => broadcast('PRICE', { symbol, price }));
}
priceStream.connect();

// ── Health ────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

// ── Bot control ───────────────────────────────────────────────
app.post('/api/bot/start',  (_, res) => { strategyEngine.start();  res.json({ running: true  }); });
app.post('/api/bot/stop',   (_, res) => { strategyEngine.stop();   res.json({ running: false }); });
app.post('/api/bot/pause',  (_, res) => { strategyEngine.pause();  res.json({ paused: true   }); });
app.post('/api/bot/resume', (_, res) => { strategyEngine.resume(); res.json({ paused: false  }); });
app.get( '/api/bot/status', (_, res) => res.json(strategyEngine.getStatus()));
app.post('/api/bot/cycle',  async (_, res) => { await strategyEngine.runCycle(); res.json({ ok: true }); });

// ── Engine toggles ────────────────────────────────────────────
app.get('/api/engines', (_, res) => res.json(strategyEngine.getEngineToggles()));
app.post('/api/engines/:name', (req, res) => {
  const { name }    = req.params;
  const { enabled } = req.body;
  strategyEngine.setEngineToggle(name, enabled);
  res.json({ [name]: enabled });
});

// ── Manual test signal ────────────────────────────────────────
app.post('/api/bot/test-signal', async (req, res) => {
  try {
    const { symbol = 'BTC-USDT', direction = 'LONG' } = req.body;
    const result = await strategyEngine.injectTestSignal(symbol, direction);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Resume profit target pause ────────────────────────────────
app.post('/api/bot/resume-profit-pause', (_, res) => {
  riskManager.manualResumeProfitTarget();
  res.json({ ok: true });
});

// ── Trades ────────────────────────────────────────────────────
app.get('/api/trades/active', (_, res) => res.json(strategyEngine.getActiveTrades()));
app.post('/api/trades/close/:tradeId', async (req, res) => {
  try { await strategyEngine.manualClose(req.params.tradeId); res.json({ ok: true }); }
  catch (err) { res.status(400).json({ error: err.message }); }
});
app.get('/api/trades/history', async (_, res) => res.json(await tradeLogger.getRecentTrades(100)));
app.get('/api/trades/stats',   async (_, res) => res.json(await tradeLogger.getDailyStats()));

// ── Signals ───────────────────────────────────────────────────
app.get('/api/signals/queue', (_, res) => res.json(signalQueue.allWithAge()));

// ── Market data ───────────────────────────────────────────────
app.get('/api/market/candles', async (req, res) => {
  try {
    const { symbol = 'BTC-USDT', interval = '1h', limit = 100 } = req.query;
    res.json(await marketData.getCandles(symbol, interval, Number(limit)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/market/ticker', async (req, res) => {
  try { res.json(await marketData.getTicker(req.query.symbol || 'BTC-USDT')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/market/orderbook', async (req, res) => {
  try { res.json(await bingx.getOrderBook(req.query.symbol || 'BTC-USDT', 50)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Analysis cache (per-pair intelligence) ────────────────────
app.get('/api/analysis', (_, res) => res.json(strategyEngine.getAnalysisCache()));
app.get('/api/analysis/:symbol', (req, res) => {
  const cache = strategyEngine.getAnalysisCache();
  res.json(cache[req.params.symbol] || {});
});

// ── Account ───────────────────────────────────────────────────
app.get('/api/account/balance',   async (_, res) => { try { res.json(await bingx.getBalance());    } catch(e){ res.status(500).json({error:e.message}); } });
app.get('/api/account/positions', async (_, res) => { try { res.json(await bingx.getPositions());  } catch(e){ res.status(500).json({error:e.message}); } });

// ── Settings ──────────────────────────────────────────────────
app.get( '/api/settings/pairs', (_, res) => res.json(cfg.PAIRS));
app.post('/api/settings/pairs', (req, res) => {
  for (const [pair, val] of Object.entries(req.body)) {
    if (cfg.PAIRS[pair]) cfg.PAIRS[pair] = { ...cfg.PAIRS[pair], ...val };
  }
  res.json(cfg.PAIRS);
});

// ── Risk ──────────────────────────────────────────────────────
app.get('/api/risk/stats',      (_, res) => res.json(riskManager.getDailyStats()));
app.get('/api/compounding',     (_, res) => {
  const s = strategyEngine.getStatus();
  res.json(microCompound.getStats(s?.balance || cfg.STARTING_CAPITAL));
});

// ── Backtest ──────────────────────────────────────────────────
app.post('/api/backtest/run', async (req, res) => {
  try {
    const { symbol = 'BTC-USDT', days = cfg.BACKTEST_DAYS } = req.body;
    const result = await backtestEngine.runBacktest(symbol, days);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/backtest/status', (_, res) => res.json(backtestEngine.getStatus()));
app.get('/api/backtest/result', (_, res) => res.json(backtestEngine.getLastResult() || { message: 'No backtest run yet' }));

// ── Debug ─────────────────────────────────────────────────────
app.get('/api/debug/candles', async (req, res) => {
  try {
    const { symbol = 'BTC-USDT', interval = '1h', limit = 5 } = req.query;
    const raw    = await bingx.getKlines(symbol, interval, Number(limit));
    const parsed = await marketData.getCandles(symbol, interval, Number(limit));
    res.json({ raw_sample: Array.isArray(raw) ? raw.slice(0,3) : raw, parsed_sample: parsed.slice(0,3), parsed_count: parsed.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Start ─────────────────────────────────────────────────────
server.listen(cfg.PORT, async () => {
  log.info(`[Server] Running on http://localhost:${cfg.PORT}`);
  try { await require('./database/sqlite').getDb(); } catch(_) {}
  telegram.init(strategyEngine);
  backtestEngine.startScheduler();
  log.info('[Server] All systems go 🚀');
});

module.exports = { app, broadcast };
