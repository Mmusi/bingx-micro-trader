// bot/volatilityExpansionPredictor.js — BB squeeze + ATR compression + volume contraction

const log = require('../utils/logger');

/**
 * Returns { compressed, expansionProbability, regime, bbWidth, atrRatio, volumeRatio }
 * regime: 'COMPRESSION' | 'RANGE' | 'EXPANSION' | 'TREND'
 */
function predictExpansion(candles) {
  if (!candles || candles.length < 30) {
    return { compressed: false, expansionProbability: 0, regime: 'UNKNOWN' };
  }

  const closes  = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  const highs   = candles.map(c => c.high);
  const lows    = candles.map(c => c.low);

  // ── Bollinger Band Width ──────────────────────────────────
  const period = 20;
  const slice  = closes.slice(-period);
  const mean   = slice.reduce((a, b) => a + b, 0) / period;
  const sd     = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
  const bbWidth = (sd * 4) / mean; // (upper-lower)/mid normalised

  // ── ATR ratio (current vs 20-period average ATR) ──────────
  const atrs = [];
  for (let i = 1; i < candles.length; i++) {
    atrs.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i]  - closes[i - 1])
    ));
  }
  const recentATR  = atrs.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const avgATR     = atrs.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const atrRatio   = avgATR > 0 ? recentATR / avgATR : 1;

  // ── Volume ratio (recent vs average) ─────────────────────
  const recentVol  = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const avgVol     = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const volumeRatio = avgVol > 0 ? recentVol / avgVol : 1;

  // ── EMA slope (trend detection) ───────────────────────────
  const k    = 2 / 21;
  let ema    = closes[0];
  let prev20 = closes[0];
  closes.forEach((v, i) => {
    if (i === closes.length - 21) prev20 = ema;
    ema = v * k + ema * (1 - k);
  });
  const emaSlope = Math.abs((ema - prev20) / prev20);

  // ── Classify regime ────────────────────────────────────────
  const compressed  = bbWidth < 0.025 && atrRatio < 0.8;
  const expanding   = atrRatio > 1.3  && volumeRatio > 1.2;
  const trending    = emaSlope > 0.003;

  let regime = 'RANGE';
  if (compressed)       regime = 'COMPRESSION';
  else if (trending)    regime = 'TREND';
  else if (expanding)   regime = 'EXPANSION';

  // ── Expansion probability 0–100 ───────────────────────────
  let prob = 0;
  if (bbWidth < 0.015) prob += 40;
  else if (bbWidth < 0.025) prob += 25;
  else if (bbWidth < 0.04)  prob += 10;

  if (atrRatio < 0.6)  prob += 30;
  else if (atrRatio < 0.8) prob += 15;

  if (volumeRatio < 0.6) prob += 20;
  else if (volumeRatio < 0.8) prob += 10;

  if (expanding) prob = Math.max(prob, 70);

  const expansionProbability = Math.min(100, Math.round(prob));

  return { compressed, expansionProbability, regime, bbWidth: +bbWidth.toFixed(4), atrRatio: +atrRatio.toFixed(3), volumeRatio: +volumeRatio.toFixed(3) };
}

module.exports = { predictExpansion };
