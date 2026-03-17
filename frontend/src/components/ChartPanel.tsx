// components/ChartPanel.tsx — Chart + summary bar + scalp mode indicator

import React, { useState } from 'react';
import TradingChart from '../charts/TradingChart';

const PAIRS     = ['BTC-USDT', 'SOL-USDT', 'AVAX-USDT', 'SUI-USDT', 'LINK-USDT', 'APT-USDT'];
const INTERVALS = ['5m', '15m', '1h', '4h', '1d'];

interface Props {
  priceMap:        Record<string, number>;
  botStatus:       any;
  onSymbolChange?: (s: string) => void;
}

export default function ChartPanel({ priceMap, botStatus, onSymbolChange }: Props) {
  const [symbol,   setSymbol]   = useState('BTC-USDT');
  const [interval, setInterval] = useState('1h');

  const changeSymbol = (s: string) => { setSymbol(s); onSymbolChange?.(s); };

  const currentPrice   = priceMap[symbol];
  const activeTrades   = (botStatus?.activeTrades || []).filter((t: any) => t.symbol === symbol);
  const allTrades      = botStatus?.activeTrades || [];
  const running        = botStatus?.running ?? false;
  const paused         = botStatus?.paused  ?? false;
  const queue          = botStatus?.queue   || [];
  const summary        = buildSummary(botStatus, symbol, activeTrades);

  // Mode counts for indicator pill
  const scalpQueued    = queue.filter((s: any) => s.source === 'SCALP').length;
  const strategicCount = queue.filter((s: any) => s.source !== 'SCALP').length;
  const scalpActive    = allTrades.filter((t: any) => t.source === 'SCALP').length;

  // Determine mode pill content + colour
  const hasScalpActivity = scalpQueued > 0 || scalpActive > 0;
  const modePillColor    = hasScalpActivity ? '#00f5ff'
    : strategicCount > 0 ? '#ffd700'
    : '#4a7a99';
  const modePillBg       = hasScalpActivity ? '#00f5ff0d'
    : strategicCount > 0 ? '#ffd7000d'
    : 'transparent';
  const modePillBorder   = hasScalpActivity ? '#00f5ff33'
    : strategicCount > 0 ? '#ffd70033'
    : '#0d2a3d';
  const modePillText     = !running         ? '○ IDLE'
    : scalpActive > 0    ? `⚡ SCALPING · ${scalpActive} active`
    : scalpQueued > 0    ? `⚡ SCALPING · ${scalpQueued} queued`
    : strategicCount > 0 ? `📡 STRATEGIC · ${strategicCount} queued`
    : '🔍 SCANNING';

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top toolbar: pair buttons + interval buttons + live price ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 14px', borderBottom: '1px solid #0d2a3d',
        flexShrink: 0, flexWrap: 'wrap',
      }}>

        {/* Pair buttons */}
        <div style={{ display: 'flex', gap: 4 }}>
          {PAIRS.map(p => {
            const hasTrade  = allTrades.some((t: any) => t.symbol === p);
            const isScalp   = allTrades.some((t: any) => t.symbol === p && t.source === 'SCALP');
            const dotColor  = isScalp ? '#00f5ff' : '#00ff88';

            return (
              <button
                key={p}
                onClick={() => changeSymbol(p)}
                style={{
                  background:  symbol === p ? '#0a1e2e' : 'transparent',
                  border:      `1px solid ${symbol === p ? '#00f5ff66' : '#0d2a3d'}`,
                  color:       symbol === p ? '#00f5ff' : '#8ec8e8',
                  padding:     '4px 10px', cursor: 'pointer',
                  fontFamily:  "'Space Mono',monospace", fontSize: 10,
                  borderRadius: 2, position: 'relative',
                }}
              >
                {p.replace('-USDT', '')}
                {/* Dot — cyan for scalp, green for strategic */}
                {hasTrade && (
                  <span style={{
                    position: 'absolute', top: -3, right: -3,
                    width: 6, height: 6, borderRadius: '50%',
                    background: dotColor,
                    boxShadow: `0 0 6px ${dotColor}`,
                  }} />
                )}
              </button>
            );
          })}
        </div>

        <div style={{ width: 1, height: 18, background: '#0d2a3d', margin: '0 2px' }} />

        {/* Interval buttons */}
        <div style={{ display: 'flex', gap: 4 }}>
          {INTERVALS.map(iv => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              style={{
                background:  interval === iv ? '#0a1e2e' : 'transparent',
                border:      `1px solid ${interval === iv ? '#ffd70066' : '#0d2a3d'}`,
                color:       interval === iv ? '#ffd700' : '#8ec8e8',
                padding:     '4px 8px', cursor: 'pointer',
                fontFamily:  "'Orbitron',sans-serif", fontSize: 9,
                letterSpacing: 1, borderRadius: 2,
              }}
            >{iv}</button>
          ))}
        </div>

        {/* Live price */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: "'Orbitron',sans-serif",
            fontSize: 10, color: '#8ec8e8', letterSpacing: 1,
          }}>{symbol}</span>
          <span style={{
            fontFamily: "'Share Tech Mono',monospace",
            fontSize: 17, color: '#00f5ff',
            textShadow: '0 0 12px #00f5ff', fontWeight: 700,
          }}>
            {currentPrice
              ? `$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
              : '—'}
          </span>
        </div>
      </div>

      {/* ── Summary bar ─────────────────────────────────────────── */}
      <div style={{
        padding: '5px 14px',
        background: '#071520',
        borderBottom: '1px solid #0d2a3d',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10,
        minHeight: 30, flexWrap: 'wrap',
      }}>

        {/* Bot status pill */}
        <span style={{
          fontFamily: "'Orbitron',sans-serif", fontSize: 8, letterSpacing: 2,
          color:   paused ? '#ffd700' : running ? '#00ff88' : '#4a7a99',
          border:  `1px solid ${paused ? '#ffd70044' : running ? '#00ff8844' : '#0d2a3d'}`,
          padding: '2px 8px', borderRadius: 2, flexShrink: 0,
        }}>
          {paused ? '⚠ PAUSED' : running ? '● ACTIVE' : '○ STOPPED'}
        </span>

        {/* Summary text */}
        <span style={{
          fontFamily: "'Share Tech Mono',monospace",
          fontSize: 11, color: summary.color, flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {summary.text}
        </span>

        {/* Mode indicator pill */}
        {running && (
          <span style={{
            fontFamily: "'Orbitron',sans-serif", fontSize: 8, letterSpacing: 1,
            color:       modePillColor,
            background:  modePillBg,
            border:      `1px solid ${modePillBorder}`,
            padding:     '2px 9px', borderRadius: 2, flexShrink: 0,
          }}>
            {modePillText}
          </span>
        )}
      </div>

      {/* ── Chart ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <TradingChart
          symbol={symbol}
          interval={interval}
          currentPrice={currentPrice}
          activeTrades={activeTrades}
        />
      </div>
    </div>
  );
}

// ── Summary text builder ──────────────────────────────────────
function buildSummary(botStatus: any, symbol: string, activeTrades: any[]) {
  if (!botStatus?.running)
    return { text: 'Bot stopped — press START to begin scanning.', color: '#4a7a99' };
  if (botStatus?.paused)
    return { text: 'Bot paused manually — press RESUME to continue.', color: '#ffd700' };

  const risk = botStatus?.riskStats || {};
  if (risk.profitTargetPaused)
    return {
      text: `🎯 Daily profit target ${risk.profitTargetPct}% reached — normal entries paused. Breakout override active (AI ≥ 80).`,
      color: '#ffd700',
    };

  // Active trade on this symbol
  if (activeTrades.length > 0) {
    const t        = activeTrades[0];
    const pnl      = (t.profitPct || 0).toFixed(2);
    const pnlNum   = Number(pnl);
    const c        = pnlNum >= 0 ? '#00ff88' : '#ff3366';
    const isScalp  = t.source === 'SCALP';

    const dStop    = t.direction === 'LONG'
      ? (((t.currentPrice || t.entryPrice) - t.stopPrice) / t.entryPrice * 100).toFixed(2)
      : ((t.stopPrice - (t.currentPrice || t.entryPrice)) / t.entryPrice * 100).toFixed(2);

    const icon     = isScalp ? '⚡' : t.direction === 'LONG' ? '▲' : '▼';
    const htf      = t.htfTrend && t.htfTrend !== 'NEUTRAL' ? ` · 1H:${t.htfTrend}` : '';
    const ai       = t.aiScore ? ` · AI ${t.aiScore}%` : '';

    return {
      text: `${icon} ${symbol} — Entry $${t.entryPrice?.toFixed(4)} · PnL ${pnlNum >= 0 ? '+' : ''}${pnl}% · ${dStop}% to stop $${t.stopPrice?.toFixed(4)}${ai}${htf} · Trailing active`,
      color: c,
    };
  }

  // Signal queued for this symbol
  const q = (botStatus.queue || []).filter((s: any) => s.symbol === symbol);
  if (q.length > 0) {
    const isScalp = q[0].source === 'SCALP';
    const htf     = q[0].htfTrend ? ` · 1H:${q[0].htfTrend}` : '';
    const reason  = q[0].scalpReason ? ` · ${q[0].scalpReason.replace(/_/g, ' ')}` : '';
    return {
      text: `${isScalp ? '⚡ SCALP' : q[0].direction} signal queued — strength ${q[0].strength}%${ai_str(q[0])} via ${q[0].source}${reason}${htf} · waiting for slot`,
      color: isScalp ? '#00f5ff' : '#ffd700',
    };
  }

  // Idle scanning
  const analysis = botStatus?.analysisCache?.[symbol];
  const regime   = analysis?.regime || '—';
  const slots    = 2 - (botStatus?.activeTrades || []).length;
  const bal      = (botStatus?.balance || 0).toFixed(4);
  return {
    text: `Scanning ${symbol} · Regime: ${regime} · ${slots} slot${slots !== 1 ? 's' : ''} open · Balance $${bal}`,
    color: '#8ec8e8',
  };
}

function ai_str(sig: any) {
  return sig.aiScore ? ` (AI ${sig.aiScore}%)` : '';
}
