// utils/telegram.js — Telegram alerts + two-way bot control

const TelegramBot = require('node-telegram-bot-api');
const cfg         = require('../config/settings');
const log         = require('../utils/logger');

let bot = null;
let engine = null; // injected after engine starts

function init(strategyEngine) {
  engine = strategyEngine;

  if (!cfg.TELEGRAM_BOT_TOKEN || cfg.TELEGRAM_BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN') {
    log.warn('[Telegram] No bot token configured — alerts disabled');
    return;
  }

  try {
    bot = new TelegramBot(cfg.TELEGRAM_BOT_TOKEN, { polling: true });
    log.info('[Telegram] Bot started');

    bot.on('message', handleCommand);
    bot.on('polling_error', (err) => log.warn('[Telegram] Poll error:', err.message));
  } catch (err) {
    log.error('[Telegram] Init failed:', err.message);
  }
}

function send(text) {
  if (!bot || !cfg.TELEGRAM_CHAT_ID || cfg.TELEGRAM_CHAT_ID === 'YOUR_TELEGRAM_CHAT_ID') return;
  bot.sendMessage(cfg.TELEGRAM_CHAT_ID, text, { parse_mode: 'Markdown' }).catch(err => {
    log.warn('[Telegram] Send error:', err.message);
  });
}

function handleCommand(msg) {
  const chatId = String(msg.chat.id);
  const text   = (msg.text || '').trim();

  // Only respond to configured chat
  if (chatId !== String(cfg.TELEGRAM_CHAT_ID)) return;

  const reply = (t) => bot.sendMessage(chatId, t, { parse_mode: 'Markdown' });

  if (text === '/start' || text === '/help') {
    return reply(
      `*BingX Micro Trader — Commands*\n\n` +
      `/status — Bot status & balance\n` +
      `/trades — Active trades\n` +
      `/queue — Signal queue\n` +
      `/pause — Pause trading\n` +
      `/resume — Resume trading\n` +
      `/close <tradeId> — Close a trade\n` +
      `/pairs — Enabled pairs\n`
    );
  }

  if (text === '/status') {
    const s = engine?.getStatus() || {};
    return reply(
      `*Status:* ${s.running ? '🟢 Running' : '🔴 Stopped'}\n` +
      `*Balance:* $${(s.balance || 0).toFixed(4)}\n` +
      `*Active Trades:* ${(s.activeTrades || []).length}/${cfg.MAX_ACTIVE_TRADES}\n` +
      `*Queue Depth:* ${(s.queue || []).length}\n` +
      `*Paused:* ${s.paused ? 'Yes' : 'No'}`
    );
  }

  if (text === '/trades') {
    const trades = engine?.getActiveTrades() || [];
    if (!trades.length) return reply('No active trades.');
    const lines = trades.map(t =>
      `• ${t.direction} ${t.symbol} @${t.entryPrice?.toFixed(4)}\n  PnL: ${(t.profitPct || 0).toFixed(2)}% | Stop: ${t.stopPrice?.toFixed(4)}`
    ).join('\n');
    return reply(`*Active Trades:*\n${lines}`);
  }

  if (text === '/queue') {
    const q = engine?.getStatus()?.queue || [];
    if (!q.length) return reply('Queue is empty.');
    const lines = q.map((s, i) => `${i+1}. ${s.direction} ${s.symbol} str=${s.strength} src=${s.source}`).join('\n');
    return reply(`*Signal Queue:*\n${lines}`);
  }

  if (text === '/pause') {
    engine?.stop();
    return reply('⏸ Trading paused.');
  }

  if (text === '/resume') {
    engine?.start();
    return reply('▶️ Trading resumed.');
  }

  if (text.startsWith('/close ')) {
    const tradeId = text.split(' ')[1];
    engine?.manualClose(tradeId)
      .then(() => reply(`✅ Trade ${tradeId} closed.`))
      .catch(err => reply(`❌ Error: ${err.message}`));
    return;
  }

  if (text === '/pairs') {
    const lines = Object.entries(cfg.PAIRS).map(([p, v]) =>
      `${v.enabled ? '✅' : '⬜'} ${p}`
    ).join('\n');
    return reply(`*Trading Pairs:*\n${lines}`);
  }
}

module.exports = { init, send };
