// ============================================================
//  BingX Micro Trader — Configuration
//  Copy this file to settings.js and fill in your values
// ============================================================

module.exports = {
  // ── BingX API ──────────────────────────────────────────────
  BINGX_API_KEY: 'YOUR_BINGX_API_KEY_HERE',
  BINGX_API_SECRET: 'YOUR_BINGX_API_SECRET_HERE',

  // ── Telegram Bot ───────────────────────────────────────────
  TELEGRAM_BOT_TOKEN: 'YOUR_TELEGRAM_BOT_TOKEN',
  TELEGRAM_CHAT_ID:   'YOUR_TELEGRAM_CHAT_ID',

  // ── Server ─────────────────────────────────────────────────
  PORT: 4000,

  // ── Capital & Risk ─────────────────────────────────────────
  STARTING_CAPITAL:      1.0,       // USD
  POSITION_ALLOCATION:   0.40,      // 40% of balance per trade
  MAX_LEVERAGE:          20,
  MIN_LEVERAGE:          5,
  MAX_DAILY_LOSS_PCT:    0.20,      // 20%
  MAX_TRADES_PER_HOUR:   5,
  MAX_ACTIVE_TRADES:     2,
  TRAILING_STOP_PCT:     0.05,      // 5%

  // ── Strategy ───────────────────────────────────────────────
  RSI_OVERSOLD:          35,
  RSI_OVERBOUGHT:        65,
  ATR_LOW_VOLATILITY:    0.003,
  ATR_HIGH_VOLATILITY:   0.007,
  MIN_AI_SCORE:          65,        // Absolute floor (regime-specific thresholds override per-signal)

  // ── Pairs ──────────────────────────────────────────────────
  // SUI and APT are now enabled — viable at $0.10 balance for scalping
  PAIRS: {
    'BTC-USDT':  { enabled: true,  minQty: 0.001 },
    'SOL-USDT':  { enabled: false, minQty: 0.1   },
    'AVAX-USDT': { enabled: false, minQty: 0.1   },
    'SUI-USDT':  { enabled: true,  minQty: 1.0   },
    'APT-USDT':  { enabled: true,  minQty: 0.1   },
    'LINK-USDT': { enabled: false, minQty: 0.1   },
  },

  // ── Engines ────────────────────────────────────────────────
  // All existing engines + new SCALP engine toggle
  ENGINES: {
    RANGE:       true,
    BREAKOUT:    true,
    LIQUIDITY:   true,
    LIQUIDATION: true,
    VOLATILITY:  true,
    SCALP:       true,   // NEW: 5m EMA crossover scalping engine
  },

  // ── Execution Loop ─────────────────────────────────────────
  ENGINE_INTERVAL_MS:    5000,     // 5 seconds
  CANDLE_LIMIT:          100,

  // ── Backtest ───────────────────────────────────────────────
  BACKTEST_DAYS:         30,
  BACKTEST_HOUR:         2,

  // ── Risk ───────────────────────────────────────────────────
  DAILY_PROFIT_TARGET_PCT:     0.10,   // 10%
  BREAKOUT_OVERRIDE_ACTIVE:    true,
  BREAKOUT_OVERRIDE_SCORE:     80,
};
