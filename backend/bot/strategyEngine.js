// bot/strategyEngine.js — Main trading loop with all intelligence engines

const cfg                    = require('../config/settings');
const log                    = require('../utils/logger');
const marketData             = require('../exchange/marketData');
const fundingRates           = require('../exchange/fundingRates');
const orderExecutor          = require('../exchange/orderExecutor');
const rangeDetector          = require('./rangeDetector');
const breakoutDetector       = require('./breakoutDetector');
const liquidityDetector      = require('./liquidityDetector');
const signalEngine           = require('./signalEngine');
const signalQueue            = require('./signalQueue');
const leverageManager        = require('./leverageManager');
const trailingStop           = require('./trailingStop');
const riskManager            = require('./riskManager');
const tradeLogger            = require('../database/tradeLogger');
const telegram               = require('../utils/telegram');
const aiSignalScorer         = require('./aiSignalScorer');
const adaptiveTradeFilter    = require('./adaptiveTradeFilter');
const liquidityHeatmapEngine = require('./liquidityHeatmapEngine');
const liquidationMapEngine   = require('./liquidationMapEngine');
const volatilityPredictor    = require('./volatilityExpansionPredictor');
const microCompounding       = require('./microCompoundingEngine');

const activeTrades = new Map();
let running       = false;
let paused        = false;   // manual safety pause
let loopTimer     = null;
let statusCache   = {};
let engineToggles = { ...cfg.ENGINES };

// Per-pair analysis cache for dashboard panels
const analysisCache = {};

// ── Controls ──────────────────────────────────────────────────
function start() {
  if (running) return;
  running = true; paused = false;
  loopTimer = setInterval(runCycle, cfg.ENGINE_INTERVAL_MS);
  log.info('[Strategy] Engine STARTED');
  telegram.send('🟢 BingX Micro Trader STARTED');
}
function stop() {
  running = false;
  if (loopTimer) clearInterval(loopTimer);
  loopTimer = null;
  log.info('[Strategy] Engine STOPPED');
  telegram.send('🔴 BingX Micro Trader STOPPED');
}
function pause()  { paused = true;  log.info('[Strategy] PAUSED'); telegram.send('⏸ Trading paused'); }
function resume() { paused = false; log.info('[Strategy] RESUMED'); telegram.send('▶️ Trading resumed'); }
function isRunning()          { return running; }
function getActiveTrades()    { return Array.from(activeTrades.values()); }
function getStatus()          { return statusCache; }
function getAnalysisCache()   { return analysisCache; }
function setEngineToggle(name, val) { engineToggles[name] = val; }
function getEngineToggles()   { return { ...engineToggles }; }

// ── Main cycle ────────────────────────────────────────────────
async function runCycle() {
  if (!running) return;

  try {
    const pairs = Object.entries(cfg.PAIRS).filter(([,v]) => v.enabled).map(([k]) => k);
    await fundingRates.refreshAll(pairs);

    // Balance
    let balance = cfg.STARTING_CAPITAL;
    try {
      const balData = await require('../exchange/bingxClient').getBalance();
      const usdt    = Array.isArray(balData?.balance)
        ? balData.balance.find(b => b.asset === 'USDT') : balData?.balance;
      balance = parseFloat(usdt?.balance || usdt?.availableMargin || cfg.STARTING_CAPITAL);
    } catch (_) {}

    microCompounding.update(balance);
    const allocation = microCompounding.getDynamicAllocation(balance);

    // ── Trailing stop checks ───────────────────────────────────
    for (const [id, trade] of activeTrades) {
      const ticker = await marketData.getTicker(trade.symbol);
      const price  = parseFloat(ticker?.lastPrice || ticker?.price || trade.entryPrice);
      const result = trailingStop.update(id, price);
      if (result.hit) {
        await closeTrade(id, trade, price, 'TRAILING_STOP');
      } else {
        trade.currentPrice = price;
        trade.profitPct    = result.profitPct;
        trade.stopPrice    = result.stopPrice;
      }
    }

    // ── Purge stale signals ────────────────────────────────────
    signalQueue.purgeStale();

    // ── Analyse each pair ─────────────────────────────────────
    for (const pair of pairs) {
      if ([...activeTrades.values()].find(t => t.symbol === pair)) continue;

      const candles = await marketData.getCandles(pair, '1h', 100);
      if (!candles || candles.length < 30) continue;

      const ticker  = await marketData.getTicker(pair);
      const price   = parseFloat(ticker?.lastPrice || ticker?.price || 0);
      if (!price) continue;

      const closes  = candles.map(c => c.close);
      const volumes = candles.map(c => c.volume);
      const avgVol  = volumes.slice(-20).reduce((a,b)=>a+b,0) / 20;
      const lastVol = volumes[volumes.length - 1];

      // Run all intelligence engines
      const volPrediction  = volatilityPredictor.predictExpansion(candles);
      const liquidityData  = engineToggles.LIQUIDITY
        ? await liquidityHeatmapEngine.analyseLiquidity(pair, price)
        : { wallDistance: null, nearestWall: null };
      const liqMap         = engineToggles.LIQUIDATION
        ? liquidationMapEngine.calcLiquidationMap(candles, price)
        : null;
      const range          = rangeDetector.detectRange(candles);
      const funding        = fundingRates.getBias(pair);

      // ATR & BB for filters
      let atr = 0, bbWidth = 0;
      if (candles.length >= 20) {
        const slice = closes.slice(-20);
        const mean  = slice.reduce((a,b)=>a+b,0)/20;
        const sd    = Math.sqrt(slice.reduce((s,v)=>s+(v-mean)**2,0)/20);
        bbWidth     = (sd*4)/mean;
        atr         = Math.abs(closes[closes.length-1] - closes[closes.length-2]);
      }
      const volatility = price > 0 ? atr / price : 0;

      // Cache per-pair analysis for dashboard
      analysisCache[pair] = {
        price, regime: volPrediction.regime,
        expansionProbability: volPrediction.expansionProbability,
        bbWidth: volPrediction.bbWidth,
        atrRatio: volPrediction.atrRatio,
        liquidity: liquidityData,
        liqMap,
        range: { support: range.support, resistance: range.resistance, inRange: range.inRange },
        funding,
        updatedAt: Date.now(),
      };

      let signal = null;
      let source = '';

      // ── Signal detection ───────────────────────────────────
      // Liquidity trap takes priority
      const liquidityTrap = liquidityDetector.detectLiquidityTrap(candles);
      if (liquidityTrap.trapped && engineToggles.LIQUIDITY) {
        signal = { direction: liquidityTrap.reverseDirection, strength: 70, source: 'LIQUIDITY_TRAP' };
        source = 'LIQUIDITY_TRAP';
      }
      // Breakout — activated when expansion probability high OR price breaks range
      else if (engineToggles.BREAKOUT && (range.inRange || volPrediction.expansionProbability > 60)) {
        const bo = breakoutDetector.detectBreakout(candles, range.support, range.resistance);
        if (bo.breakout) {
          signal = { direction: bo.direction, strength: bo.strength, source: 'BREAKOUT' };
          source = 'BREAKOUT';
        }
      }
      // Range trade
      if (!signal && engineToggles.RANGE && range.inRange) {
        const s = signalEngine.generateSignal(candles, range);
        if (s.signal) {
          signal = { direction: s.signal, strength: s.strength, source: 'RANGE', rsi: s.rsi, pattern: s.pattern };
          source = 'RANGE';
        }
      }

      if (!signal) continue;

      // ── AI Scoring ────────────────────────────────────────
      const rsiVals = closes.slice(-15);
      let rsiVal = 50;
      try {
        let ag=0,al=0;
        for(let i=1;i<=14;i++){const d=rsiVals[i]-rsiVals[i-1];d>0?ag+=d:al-=d;}
        ag/=14;al/=14;
        rsiVal = al===0?100:100-100/(1+ag/al);
      } catch(_){}

      const scored = aiSignalScorer.scoreSignal({
        direction:         signal.direction,
        rsi:               rsiVal,
        volume:            lastVol,
        avgVolume:         avgVol,
        atr,
        price,
        fundingBias:       funding,
        bbWidth,
        nearLevel:         range.inRange && (range.support != null || range.resistance != null),
        pattern:           signal.source === 'RANGE' ? (signal.direction === 'LONG' ? 'BULLISH' : 'BEARISH') : 'NEUTRAL',
        liquidityDistance: liquidityData.wallDistance,
      }, cfg.MIN_AI_SCORE);

      signal.aiScore    = scored.score;
      signal.breakdown  = scored.components;

      if (!scored.pass) {
        log.info(`[Strategy] ${pair} ${signal.direction} rejected by AI scorer: ${scored.score}/${cfg.MIN_AI_SCORE}`);
        continue;
      }

      // ── Adaptive filter ───────────────────────────────────
      const filtered = adaptiveTradeFilter.filterTrade({
        spreadPct:           liquidityData.nearestWall ? null : null, // spread not directly available
        volatility,
        liquidationDistance: liqMap?.nearestLongLiq
          ? Math.abs(liqMap.nearestLongLiq.price - price) / price
          : null,
        aiScore: scored.score,
      });

      if (!filtered.allowed) {
        log.info(`[Strategy] ${pair} blocked by adaptive filter: ${filtered.reason}`);
        continue;
      }

      const leverage = leverageManager.calcLeverage(candles);
      const minQty   = cfg.PAIRS[pair]?.minQty || 0.001;
      const qty      = riskManager.calcQuantity(balance * allocation / cfg.POSITION_ALLOCATION, price, leverage, minQty);

      signalQueue.add({
        symbol: pair, direction: signal.direction, strength: signal.aiScore,
        source, price, leverage, quantity: qty,
        aiScore: signal.aiScore, breakdown: signal.breakdown,
      });
    }

    // ── Execute if slot available ─────────────────────────────
    if (!paused) {
      while (activeTrades.size < cfg.MAX_ACTIVE_TRADES && signalQueue.size() > 0) {
        const next = signalQueue.next();
        if (!next) break;
        if ([...activeTrades.values()].find(t => t.symbol === next.symbol)) continue;

        // Normal risk check
        const isBreakout = next.source === 'BREAKOUT';
        const allowed    = riskManager.canTrade(balance)
          || (isBreakout && riskManager.canTradeBreakout(balance, next.aiScore || 0));

        if (!allowed) { log.info(`[Strategy] Trade blocked by risk manager`); break; }
        await executeTrade(next, balance);
      }
    }

    statusCache = {
      running, paused,
      balance,
      pairs,
      activeTrades:  getActiveTrades(),
      queue:         signalQueue.allWithAge(),
      riskStats:     riskManager.getDailyStats(),
      compounding:   microCompounding.getStats(balance),
      engineToggles,
      analysisCache,
    };

  } catch (err) {
    log.error('[Strategy] Cycle error:', err.message);
  }
}

// ── Execute a trade ───────────────────────────────────────────
async function executeTrade(signal, balance) {
  try {
    const { symbol, direction, price, leverage, quantity, source } = signal;
    if (!riskManager.canTrade(balance) && !(source === 'BREAKOUT' && riskManager.canTradeBreakout(balance, signal.aiScore || 0))) return;

    const useMarket = source === 'BREAKOUT' || source === 'LIQUIDITY_TRAP';
    await orderExecutor.openTrade({ symbol, direction, price, quantity, leverage, useMarket });

    const tradeId = `${symbol}-${direction}-${Date.now()}`;
    const trade   = {
      id: tradeId, symbol, direction, entryPrice: price,
      currentPrice: price, quantity, leverage, source,
      aiScore: signal.aiScore || 0,
      profitPct: 0,
      stopPrice: direction === 'LONG' ? price * 0.95 : price * 1.05,
      openedAt: Date.now(),
    };
    activeTrades.set(tradeId, trade);
    trailingStop.init(tradeId, price, direction);
    riskManager.recordTrade(0, price * quantity);

    await tradeLogger.logTrade({ pair: symbol, direction, entryPrice: price, leverage, quantity, status: 'OPEN', source });
    log.info(`[Strategy] OPENED ${direction} ${symbol} @${price} lev=${leverage}x AI=${signal.aiScore || '?'}`);
    telegram.send(`📈 *NEW TRADE*\n${direction} ${symbol}\nEntry: $${price.toFixed(4)} | Lev: ${leverage}x\nAI Score: ${signal.aiScore || '?'}% | Src: ${source}`);
  } catch (err) {
    log.error('[Strategy] executeTrade error:', err.message);
  }
}

// ── Close a trade ─────────────────────────────────────────────
async function closeTrade(tradeId, trade, exitPrice, reason) {
  try {
    await orderExecutor.closeTrade(trade.symbol, trade.direction, trade.quantity);
    activeTrades.delete(tradeId);
    const pnl = trade.direction === 'LONG'
      ? (exitPrice - trade.entryPrice) / trade.entryPrice * 100
      : (trade.entryPrice - exitPrice) / trade.entryPrice * 100;
    const notional = trade.entryPrice * trade.quantity;
    riskManager.recordTrade(pnl, notional);
    await tradeLogger.updateTrade(tradeId, { exitPrice, profit: pnl, status: 'CLOSED' });
    const emoji = pnl >= 0 ? '✅' : '❌';
    log.info(`[Strategy] CLOSED ${trade.direction} ${trade.symbol} | PnL: ${pnl.toFixed(2)}% | ${reason}`);
    telegram.send(`${emoji} *CLOSED* ${trade.direction} ${trade.symbol}\nPnL: ${pnl.toFixed(2)}% | ${reason}`);
  } catch (err) {
    log.error('[Strategy] closeTrade error:', err.message);
  }
}

async function manualClose(tradeId) {
  const trade = activeTrades.get(tradeId);
  if (!trade) throw new Error('Trade not found');
  const ticker    = await marketData.getTicker(trade.symbol);
  const exitPrice = parseFloat(ticker?.lastPrice || ticker?.price || trade.entryPrice);
  await closeTrade(tradeId, trade, exitPrice, 'MANUAL');
}

// Manual test signal injection
async function injectTestSignal(symbol, direction) {
  const ticker = await marketData.getTicker(symbol);
  const price  = parseFloat(ticker?.lastPrice || ticker?.price || 0);
  signalQueue.add({ symbol, direction, strength: 99, source: 'MANUAL_TEST', price, leverage: 5, quantity: 0.001, aiScore: 99 });
  log.info(`[Strategy] 🧪 Test signal injected: ${direction} ${symbol}`);
  return { ok: true, symbol, direction, price };
}

module.exports = {
  start, stop, pause, resume,
  isRunning, getActiveTrades, getStatus, getAnalysisCache,
  manualClose, injectTestSignal, runCycle,
  setEngineToggle, getEngineToggles,
};
