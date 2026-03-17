// bot/signalQueue.js — Signal queue with priority ordering, TTL enforcement, staleness purge

const log = require('../utils/logger');

const EXECUTE_TTL_MS = 10 * 60 * 1000;  // signal expires for execution after 10 min
const PURGE_AGE_MS   = 30 * 60 * 1000;  // signal is purged from queue after 30 min

class SignalQueue {
  constructor(maxSize = 10) {
    this.queue   = [];
    this.maxSize = maxSize;
  }

  add(signal) {
    // Deduplicate same symbol+direction — refresh timestamp if incoming is stronger
    const idx = this.queue.findIndex(
      s => s.symbol === signal.symbol && s.direction === signal.direction
    );

    if (idx !== -1) {
      if (signal.strength > this.queue[idx].strength) {
        this.queue[idx].strength = signal.strength;
        this.queue[idx].queuedAt = Date.now(); // reset age on upgrade
        this.queue.sort((a, b) => b.strength - a.strength);
      }
      return;
    }

    this.queue.push({ ...signal, queuedAt: Date.now() });
    this.queue.sort((a, b) => b.strength - a.strength);

    if (this.queue.length > this.maxSize) {
      this.queue = this.queue.slice(0, this.maxSize);
    }

    log.info(`[Queue] + ${signal.direction} ${signal.symbol} str=${signal.strength} src=${signal.source} | depth=${this.queue.length}`);
  }

  // Pop next signal — skip silently if older than EXECUTE_TTL_MS (10 min)
  next() {
    while (this.queue.length > 0) {
      const s   = this.queue.shift();
      const age = Date.now() - s.queuedAt;
      if (age <= EXECUTE_TTL_MS) {
        log.info(`[Queue] Executing ${s.direction} ${s.symbol} (${Math.round(age / 1000)}s old)`);
        return s;
      }
      log.info(`[Queue] ⏱ Skipped expired signal: ${s.direction} ${s.symbol} — ${Math.round(age / 60000)}m old (max 10m)`);
    }
    return null;
  }

  // Remove all signals older than PURGE_AGE_MS (30 min) — called every cycle
  purgeStale() {
    const before = this.queue.length;
    const cutoff = Date.now() - PURGE_AGE_MS;
    this.queue   = this.queue.filter(s => s.queuedAt > cutoff);
    const pruned = before - this.queue.length;
    if (pruned > 0) {
      log.info(`[Queue] 🗑  Purged ${pruned} stale signal(s) older than 30m — ${this.queue.length} remaining`);
    }
    return pruned;
  }

  peek()              { return this.queue[0] || null; }
  remove(sym, dir)    { const b = this.queue.length; this.queue = this.queue.filter(s => !(s.symbol === sym && s.direction === dir)); return this.queue.length < b; }
  removeBySymbol(sym) { this.queue = this.queue.filter(s => s.symbol !== sym); }
  all()               { return [...this.queue]; }
  size()              { return this.queue.length; }
  clear()             { this.queue = []; }

  // For display: enrich each signal with human-readable age
  allWithAge() {
    return this.queue.map(s => ({
      ...s,
      ageSeconds: Math.round((Date.now() - s.queuedAt) / 1000),
      ageLabel:   formatAge(Date.now() - s.queuedAt),
      expiresSoon: (Date.now() - s.queuedAt) > 7 * 60 * 1000, // warn at 7 min
    }));
  }
}

function formatAge(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

module.exports = new SignalQueue();
