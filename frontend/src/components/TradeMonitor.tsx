// components/TradeMonitor.tsx — Active trades with trailing stop display
// ADDITIONS: Trade type badges (SCALP/RANGE/BREAKOUT/LIQUIDITY), HTF trend display

import React from 'react';
import { tradeAPI } from '../services/api';

interface Trade {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  profitPct: number;
  stopPrice: number;
  leverage: number;
  quantity: number;
  source: string;
  openedAt: number;
  htfTrend?: string;
}

interface Props {
  trades: Trade[];
  onClose: (id: string) => void;
}

// ── NEW: Source badge config ──────────────────────────────────
const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  SCALP:         { label: '⚡ SCALP',    color: '#00f5ff' },
  BREAKOUT:      { label: '🚀 BREAKOUT', color: '#ffd700' },
  LIQUIDITY_TRAP:{ label: '🪤 LIQ TRAP', color: '#bf5fff' },
  RANGE:         { label: '📊 RANGE',    color: '#8ec8e8' },
  MANUAL_TEST:   { label: '🧪 TEST',     color: '#4a7a99' },
};

export default function TradeMonitor({ trades, onClose }: Props) {
  const handleClose = async (id: string) => {
    try {
      await tradeAPI.close(id);
      onClose(id);
    } catch (err) {
      console.error('Close trade error:', err);
    }
  };

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title">
        <span className="dot" />
        ACTIVE TRADES
        <span style={{ marginLeft: 'auto', color: '#4a7a99', fontSize: 9 }}>
          {trades.length}/2 SLOTS
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {trades.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 80, color: '#4a7a99', fontSize: 11,
            fontFamily: "'Share Tech Mono', monospace",
          }}>
            NO ACTIVE TRADES
          </div>
        ) : (
          trades.map(trade => (
            <TradeRow key={trade.id} trade={trade} onClose={handleClose} />
          ))
        )}
      </div>
    </div>
  );
}

function TradeRow({ trade, onClose }: { trade: Trade; onClose: (id: string) => void }) {
  const pnl      = trade.profitPct || 0;
  const pnlColor = pnl >= 0 ? '#00ff88' : '#ff3366';
  const age      = Math.floor((Date.now() - trade.openedAt) / 60000);

  const stopDist = trade.direction === 'LONG'
    ? ((trade.currentPrice - trade.stopPrice) / trade.entryPrice) * 100
    : ((trade.stopPrice - trade.currentPrice) / trade.entryPrice) * 100;

  // ── NEW: source badge ─────────────────────────────────────
  const badge = SOURCE_BADGE[trade.source] || { label: trade.source, color: '#4a7a99' };

  return (
    <div style={{
      margin: '6px 10px',
      padding: '10px 12px',
      background: '#071520',
      border: `1px solid ${pnl >= 0 ? '#00ff8833' : '#ff336633'}`,
      borderRadius: 2,
      position: 'relative',
      // NEW: left accent colour by source type
      borderLeft: `3px solid ${badge.color}66`,
    }}>
      {/* Direction badge + symbol + NEW type badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span className={`tag tag-${trade.direction.toLowerCase()}`}>{trade.direction}</span>
        <span style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 12, fontWeight: 700,
          color: '#e0f4ff', letterSpacing: 1,
        }}>{trade.symbol}</span>

        {/* ── NEW: Source type badge ── */}
        <span style={{
          fontSize: 8,
          fontFamily: "'Orbitron', sans-serif",
          color: badge.color,
          background: `${badge.color}18`,
          border: `1px solid ${badge.color}55`,
          padding: '1px 6px',
          borderRadius: 2,
          letterSpacing: 1,
        }}>{badge.label}</span>

        {/* ── NEW: HTF trend indicator for scalps ── */}
        {trade.htfTrend && trade.htfTrend !== 'NEUTRAL' && (
          <span style={{
            fontSize: 8,
            fontFamily: "'Share Tech Mono', monospace",
            color: trade.htfTrend === 'LONG' ? '#00ff88' : '#ff3366',
          }}>
            1H:{trade.htfTrend}
          </span>
        )}

        <span style={{ fontSize: 9, color: '#4a7a99', marginLeft: 'auto' }}>
          {age}m ago
        </span>
      </div>

      {/* Prices */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
        <MiniStat label="ENTRY"   value={`$${trade.entryPrice?.toFixed(2)}`}    />
        <MiniStat label="CURRENT" value={`$${(trade.currentPrice || trade.entryPrice)?.toFixed(2)}`} highlight />
        <MiniStat label="STOP"    value={`$${trade.stopPrice?.toFixed(2)}`}      dim />
      </div>

      {/* PnL + leverage */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 16, fontWeight: 900,
          color: pnlColor,
          textShadow: `0 0 15px ${pnlColor}`,
        }}>
          {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
        </div>
        <span style={{ fontSize: 9, color: '#8ec8e8' }}>LEV {trade.leverage}x</span>
        <span style={{ fontSize: 9, color: '#8ec8e8' }}>QTY {trade.quantity}</span>

        {/* Trailing stop bar */}
        <div style={{ flex: 1, height: 3, background: '#0d2a3d', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width:      `${Math.max(0, Math.min(100, stopDist * 5))}%`,
            height:     '100%',
            background: pnlColor,
            transition: 'width 0.5s ease',
          }} />
        </div>

        {/* Close button */}
        <button
          className="btn btn-red"
          onClick={() => onClose(trade.id)}
          style={{ padding: '4px 10px', fontSize: 9 }}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}

function MiniStat({ label, value, highlight, dim }: any) {
  return (
    <div>
      <div style={{ fontSize: 8, color: '#4a7a99', fontFamily: "'Orbitron', sans-serif", letterSpacing: 1 }}>
        {label}
      </div>
      <div style={{
        fontSize: 11,
        fontFamily: "'Share Tech Mono', monospace",
        color: highlight ? '#00f5ff' : dim ? '#8ec8e8' : '#e0f4ff',
      }}>
        {value}
      </div>
    </div>
  );
}
