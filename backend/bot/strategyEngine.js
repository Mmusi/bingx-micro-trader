// bot/strategyEngine.js — Main trading loop with all intelligence engines
// ADDITIONS (non-breaking):
//   • Scalping engine (5m EMA crossover) — fires 5–15x/day
//   • Multi-timeframe engine (1H direction + 5m entry)
//   • Regime-based AI score thresholds
//   • Pair minimum balance routing
//   • Smart slot release for high-conviction signals (BREAKOUT/LIQUIDITY_TRAP AI ≥85)
// ALL existing logic, rules, guards and engines remain 100% intact.

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

// ── NEW: supplementary engines (non-breaking) ─────────────────
const scalpEngine       = require('./scalpEngine');
const mtfEngine         = require('./mtfEngine');
const pairBalanceRouter = require('./pairBalanceRouter');
const slotReleaseManager = require('./slotReleaseManager');

const activeTrades = new Map();
let running       = false;
let paused        = false;
let loopTimer     = null;
let statusCache   = {};
let engineToggles = { ...cfg.ENGINES };

const analysisCache = {};

// ── NEW: Regime-based AI score thresholds ────────────────────
// These REPLACE the single cfg.MIN_AI_SCORE only within the new
// regime logic. The original cfg.MIN_AI_SCORE still acts as the
// absolute floor for adaptive filter checks.
const REGIME_AI_THRESHOLDS = {
  COMPRESSION: 65,   // precise — big move coming
  TREND:       50,   // trend continuation, higher base probability
  RANGE:       60,
  BREAKOUT:    55,   // speed matters
  EXPANSION:   55,
  UNKNOWN:     65,
  // SCALP is handled separately (always 50)
};

function getRegimeAIThreshold(regime, source) {
  if (source === 'SCALP') return 50;
  return REGIME_AI_THRESHOLDS[regime] || cfg.MIN_AI_SCORE;
}

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

    // ── NEW: filter pairs by minimum balance requirement ───────
    const viablePairs = pairBalanceRouter.getViablePairs(pairs, balance);
    if (viablePairs.length < pairs.length) {
      const skipped = pairs.filter(p => !viablePairs.includes(p));
      log.info(`[Strategy] Pairs skipped (balance too low): ${skipped.join(', ')}`);
    }

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

    // ── Analyse each viable pair ───────────────────────────────
    for (const pair of viablePairs) {
      if ([...activeTrades.values()].find(t => t.symbol === pair)) continue;

      const candles1h = await marketData.getCandles(pair, '1h', 100);
      if (!candles1h || candles1h.length < 30) continue;

      const ticker  = await marketData.getTicker(pair);
      const price   = parseFloat(ticker?.lastPrice || ticker?.price || 0);
      if (!price) continue;

      const closes  = candles1h.map(c => c.close);
      const volumes = candles1h.map(c => c.volume);
      const avgVol  = volumes.slice(-20).reduce((a,b)=>a+b,0) / 20;
      const lastVol = volumes[volumes.length - 1];

      // Run all intelligence engines (unchanged)
      const volPrediction  = volatilityPredictor.predictExpansion(candles1h);
      const liquidityData  = engineToggles.LIQUIDITY
        ? await liquidityHeatmapEngine.analyseLiquidity(pair, price)
        : { wallDistance: null, nearestWall: null };
      const liqMap         = engineToggles.LIQUIDATION
        ? liquidationMapEngine.calcLiquidationMap(candles1h, price)
        : null;
      const range          = rangeDetector.detectRange(candles1h);
      const funding        = fundingRates.getBias(pair);

      // ATR & BB for filters
      let atr = 0, bbWidth = 0;
      if (candles1h.length >= 20) {
        const slice = closes.slice(-20);
        const mean  = slice.reduce((a,b)=>a+b,0)/20;
        const sd    = Math.sqrt(slice.reduce((s,v)=>s+(v-mean)**2,0)/20);
        bbWidth     = (sd*4)/mean;
        atr         = Math.abs(closes[closes.length-1] - closes[closes.length-2]);
      }
      const volatility = price > 0 ? atr / price : 0;

      // Cache per-pair analysis (unchanged)
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

      const regime = volPrediction.regime || 'UNKNOWN';
      let signal = null;
      let source = '';

      // ── Existing signal detection (ALL UNCHANGED) ──────────
      const liquidityTrap = liquidityDetector.detectLiquidityTrap(candles1h);
      if (liquidityTrap.trapped && engineToggles.LIQUIDITY) {
        signal = { direction: liquidityTrap.reverseDirection, strength: 70, source: 'LIQUIDITY_TRAP' };
        source = 'LIQUIDITY_TRAP';
      }
      else if (engineToggles.BREAKOUT && (range.inRange || volPrediction.expansionProbability > 60)) {
        const bo = breakoutDetector.detectBreakout(candles1h, range.support, range.resistance);
        if (bo.breakout) {
          signal = { direction: bo.direction, strength: bo.strength, source: 'BREAKOUT' };
          source = 'BREAKOUT';
        }
      }
      if (!signal && engineToggles.RANGE && range.inRange) {
        const s = signalEngine.generateSignal(candles1h, range);
        if (s.signal) {
          signal = { direction: s.signal, strength: s.strength, source: 'RANGE', rsi: s.rsi, pattern: s.pattern };
          source = 'RANGE';
        }
      }

      // ── NEW: Scalping engine (runs if no strategic signal found) ──
      // This supplements the existing engines — it never overrides them.
      if (!signal && engineToggles.SCALP !== false) {
        try {
          const candles5m = await marketData.getCandles(pair, '5m', 60);
          if (candles5m && candles5m.length >= 30) {
            const scalpResult = scalpEngine.detectScalpSignal(candles5m);
            if (scalpResult.signal) {
              // NEW: MTF alignment check — only trade with 1H trend
              const mtfCheck = mtfEngine.checkMTFAlignment(scalpResult.signal, candles1h);
              if (mtfCheck.aligned) {
                signal = {
                  direction: scalpResult.signal,
                  strength:  scalpResult.strength,
                  source:    'SCALP',
                  scalpReason: scalpResult.reason,
                  htfTrend:  mtfCheck.htfTrend,
                };
                source = 'SCALP';
                log.info(`[Strategy] SCALP signal ${pair} ${scalpResult.signal} — ${scalpResult.reason} | HTF:${mtfCheck.htfTrend}`);
              } else {
                log.debug(`[Strategy] SCALP ${pair} ${scalpResult.signal} blocked — ${mtfCheck.reason}`);
              }
            }
          }
        } catch (err) {
          log.debug(`[Strategy] Scalp engine error ${pair}: ${err.message}`);
        }
      }

      if (!signal) continue;

      // ── AI Scoring (unchanged calculation) ───────────────────
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
      }, cfg.MIN_AI_SCORE);  // cfg.MIN_AI_SCORE used as absolute floor

      signal.aiScore   = scored.score;
      signal.breakdown = scored.components;

      // ── NEW: Regime-based AI threshold (replaces single flat threshold) ──
      const regimeThreshold = getRegimeAIThreshold(regime, source);
      if (scored.score < regimeThreshold) {
        log.info(`[Strategy] ${pair} ${signal.direction} rejected — score ${scored.score} < regime threshold ${regimeThreshold} (regime:${regime}, src:${source})`);
        continue;
      }

      // ── Adaptive filter (unchanged) ───────────────────────────
      const filtered = adaptiveTradeFilter.filterTrade({
        spreadPct:           null,
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

      // Scalp trades always use 10x leverage (safer for frequent trades)
      const leverage = source === 'SCALP'
        ? 10
        : leverageManager.calcLeverage(candles1h);
      const minQty   = cfg.PAIRS[pair]?.minQty || 0.001;
      const qty      = riskManager.calcQuantity(balance * allocation / cfg.POSITION_ALLOCATION, price, leverage, minQty);

      signalQueue.add({
        symbol: pair, direction: signal.direction, strength: signal.aiScore,
        source, price, leverage, quantity: qty,
        aiScore: signal.aiScore, breakdown: signal.breakdown,
        htfTrend: signal.htfTrend || null,
        scalpReason: signal.scalpReason || null,
      });
    }

    // ── Execute if slot available ─────────────────────────────
    if (!paused) {
      // ── NEW: Smart slot release check ─────────────────────────
      // Before trying to execute, check if a high-conviction signal
      // is waiting but both slots are full — and a weaker profitable
      // trade can be closed to make room.
      if (activeTrades.size >= cfg.MAX_ACTIVE_TRADES && signalQueue.size() > 0) {
        const topSignal = signalQueue.peek();
        if (topSignal) {
          const releaseCheck = slotReleaseManager.checkSlotRelease(
            topSignal,
            Array.from(activeTrades.values())
          );
          if (releaseCheck.shouldRelease && releaseCheck.tradeToClose) {
            const tradeToClose = releaseCheck.tradeToClose;
            const closeTicker  = await marketData.getTicker(tradeToClose.symbol);
            const closePrice   = parseFloat(closeTicker?.lastPrice || closeTicker?.price || tradeToClose.entryPrice);
            log.info(`[Strategy] ${releaseCheck.reason}`);
            telegram.send(`🔄 *SLOT RELEASE*\nClosing ${tradeToClose.direction} ${tradeToClose.symbol} (+${(tradeToClose.profitPct||0).toFixed(2)}%)\nReason: ${releaseCheck.reason}`);
            await closeTrade(tradeToClose.id, tradeToClose, closePrice, 'SLOT_RELEASE');
          }
        }
      }

      // Standard execution loop (unchanged)
      while (activeTrades.size < cfg.MAX_ACTIVE_TRADES && signalQueue.size() > 0) {
        const next = signalQueue.next();
        if (!next) break;
        if ([...activeTrades.values()].find(t => t.symbol === next.symbol)) continue;

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

// ── Execute a trade (unchanged, extended for SCALP source) ───
async function executeTrade(signal, balance) {
  try {
    const { symbol, direction, price, leverage, quantity, source } = signal;
    if (!riskManager.canTrade(balance) && !(source === 'BREAKOUT' && riskManager.canTradeBreakout(balance, signal.aiScore || 0))) return;

    // Scalps always use market orders (speed critical)
    const useMarket = source === 'BREAKOUT' || source === 'LIQUIDITY_TRAP' || source === 'SCALP';
    await orderExecutor.openTrade({ symbol, direction, price, quantity, leverage, useMarket });

    const tradeId = `${symbol}-${direction}-${Date.now()}`;
    const trade   = {
      id: tradeId, symbol, direction, entryPrice: price,
      currentPrice: price, quantity, leverage, source,
      aiScore: signal.aiScore || 0,
      profitPct: 0,
      stopPrice: direction === 'LONG' ? price * 0.95 : price * 1.05,
      openedAt: Date.now(),
      // NEW: scalp-specific stop is tighter (1.5%)
      ...(source === 'SCALP' ? {
        stopPrice: direction === 'LONG' ? price * 0.985 : price * 1.015,
      } : {}),
    };
    activeTrades.set(tradeId, trade);
    trailingStop.init(tradeId, price, direction);
    riskManager.recordTrade(0, price * quantity);

    await tradeLogger.logTrade({ pair: symbol, direction, entryPrice: price, leverage, quantity, status: 'OPEN', source });

    const typeLabel = source === 'SCALP' ? '⚡ SCALP' : source === 'BREAKOUT' ? '🚀 BREAKOUT' : source === 'LIQUIDITY_TRAP' ? '🪤 LIQ TRAP' : '📊 RANGE';
    log.info(`[Strategy] OPENED ${typeLabel} ${direction} ${symbol} @${price} lev=${leverage}x AI=${signal.aiScore || '?'}`);
    telegram.send(`${typeLabel} *NEW TRADE*\n${direction} ${symbol}\nEntry: $${price.toFixed(4)} | Lev: ${leverage}x\nAI Score: ${signal.aiScore || '?'}% | Src: ${source}${signal.htfTrend ? ' | HTF:' + signal.htfTrend : ''}`);
  } catch (err) {
    log.error('[Strategy] executeTrade error:', err.message);
  }
}

// ── Close a trade (unchanged) ─────────────────────────────────
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
