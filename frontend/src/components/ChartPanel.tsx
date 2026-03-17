// components/ChartPanel.tsx — Chart panel with summary bar

import React, { useState } from 'react';
import TradingChart from '../charts/TradingChart';

const PAIRS     = ['BTC-USDT','SOL-USDT','AVAX-USDT','SUI-USDT','LINK-USDT','APT-USDT'];
const INTERVALS = ['5m','15m','1h','4h','1d'];

interface Props {
  priceMap:        Record<string, number>;
  botStatus:       any;
  onSymbolChange?: (s: string) => void;
}

export default function ChartPanel({ priceMap, botStatus, onSymbolChange }: Props) {
  const [symbol,   setSymbol]   = useState('BTC-USDT');
  const [interval, setInterval] = useState('1h');

  const changeSymbol = (s: string) => { setSymbol(s); onSymbolChange?.(s); };

  const currentPrice  = priceMap[symbol];
  const activeTrades  = (botStatus?.activeTrades || []).filter((t: any) => t.symbol === symbol);
  const running       = botStatus?.running ?? false;
  const paused        = botStatus?.paused  ?? false;
  const summary       = buildSummary(botStatus, symbol, activeTrades);

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderBottom: '1px solid #0d2a3d', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {PAIRS.map(p => {
            const hasTrade = (botStatus?.activeTrades || []).some((t: any) => t.symbol === p);
            return (
              <button key={p} onClick={() => changeSymbol(p)} style={{
                background: symbol === p ? '#0a1e2e' : 'transparent',
                border:     `1px solid ${symbol === p ? '#00f5ff66' : '#0d2a3d'}`,
                color:      symbol === p ? '#00f5ff' : '#8ec8e8',
                padding: '4px 10px', cursor: 'pointer',
                fontFamily: "'Space Mono',monospace", fontSize: 10, borderRadius: 2, position: 'relative',
              }}>
                {p.replace('-USDT', '')}
                {hasTrade && <span style={{ position: 'absolute', top: -3, right: -3, width: 6, height: 6, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />}
              </button>
            );
          })}
        </div>
        <div style={{ width: 1, height: 18, background: '#0d2a3d', margin: '0 4px' }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {INTERVALS.map(iv => (
            <button key={iv} onClick={() => setInterval(iv)} style={{
              background: interval === iv ? '#0a1e2e' : 'transparent',
              border:     `1px solid ${interval === iv ? '#ffd70066' : '#0d2a3d'}`,
              color:      interval === iv ? '#ffd700' : '#8ec8e8',
              padding: '4px 8px', cursor: 'pointer',
              fontFamily: "'Orbitron',sans-serif", fontSize: 9, letterSpacing: 1, borderRadius: 2,
            }}>{iv}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: '#8ec8e8', letterSpacing: 1 }}>{symbol}</span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 17, color: '#00f5ff', textShadow: '0 0 12px #00f5ff', fontWeight: 700 }}>
            {currentPrice ? `$${currentPrice.toLocaleString('en-US',{ minimumFractionDigits:2, maximumFractionDigits:4 })}` : '—'}
          </span>
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ padding: '6px 14px', background: '#071520', borderBottom: '1px solid #0d2a3d', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, minHeight: 30 }}>
        <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, letterSpacing: 2, color: paused ? '#ffd700' : running ? '#00ff88' : '#4a7a99', border: `1px solid ${paused ? '#ffd70044' : running ? '#00ff8844' : '#0d2a3d'}`, padding: '2px 8px', borderRadius: 2 }}>
          {paused ? '⚠ PAUSED' : running ? '● TRADING' : '○ STOPPED'}
        </span>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: summary.color, flex: 1 }}>{summary.text}</span>
        {(botStatus?.queue || []).length > 0 && (
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#ffd700' }}>
            {botStatus.queue.length} signal{botStatus.queue.length > 1 ? 's' : ''} queued
          </span>
        )}
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <TradingChart symbol={symbol} interval={interval} currentPrice={currentPrice} activeTrades={activeTrades} />
      </div>
    </div>
  );
}

function buildSummary(botStatus: any, symbol: string, activeTrades: any[]) {
  if (!botStatus?.running)  return { text: 'Bot stopped. Press START to begin.', color: '#4a7a99' };
  if (botStatus?.paused)    return { text: 'Bot paused manually. Press RESUME to continue.', color: '#ffd700' };
  const risk = botStatus?.riskStats || {};
  if (risk.profitTargetPaused) return { text: `🎯 Daily profit target hit (${risk.profitTargetPct}%). Normal entries paused. Breakout override armed for AI score ≥80.`, color: '#ffd700' };

  if (activeTrades.length > 0) {
    const t   = activeTrades[0];
    const pnl = (t.profitPct || 0).toFixed(2);
    const dStop = t.direction === 'LONG'
      ? (((t.currentPrice || t.entryPrice) - t.stopPrice) / t.entryPrice * 100).toFixed(2)
      : ((t.stopPrice - (t.currentPrice || t.entryPrice)) / t.entryPrice * 100).toFixed(2);
    const c = Number(pnl) >= 0 ? '#00ff88' : '#ff3366';
    return { text: `${t.direction === 'LONG' ? '▲' : '▼'} ${symbol} — Entry $${t.entryPrice?.toFixed(2)} · PnL ${Number(pnl) >= 0 ? '+' : ''}${pnl}% · ${dStop}% above stop $${t.stopPrice?.toFixed(2)} · AI ${t.aiScore || '?'}% · Trailing active`, color: c };
  }
  const q = (botStatus.queue || []).filter((s: any) => s.symbol === symbol);
  if (q.length > 0) return { text: `${q[0].direction} signal queued — strength ${q[0].strength}% via ${q[0].source}. Waiting for a slot.`, color: '#ffd700' };

  const analysis = botStatus?.analysisCache?.[symbol];
  const regime   = analysis?.regime || 'scanning';
  return { text: `Scanning ${symbol} — regime: ${regime} · ${2 - (botStatus?.activeTrades||[]).length} slot(s) open · Balance $${(botStatus?.balance||0).toFixed(4)}`, color: '#8ec8e8' };
}
