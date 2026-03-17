// components/TradeMonitor.tsx — Active trades with trailing stop + scalp badges
// SCALP trades: cyan left border, ⚡ SCALP badge, HTF trend, AI score, scalp target bar
// Strategic trades: colour-coded border by source, type badge, AI score

import React from 'react';
import { tradeAPI } from '../services/api';

interface Trade {
  id:           string;
  symbol:       string;
  direction:    'LONG' | 'SHORT';
  entryPrice:   number;
  currentPrice: number;
  profitPct:    number;
  stopPrice:    number;
  leverage:     number;
  quantity:     number;
  source:       string;
  aiScore:      number;
  openedAt:     number;
  htfTrend?:   string;
}

interface Props {
  trades:  Trade[];
  onClose: (id: string) => void;
}

// ── Source badge definitions ──────────────────────────────────
const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  SCALP:          { label: '⚡ SCALP',    color: '#00f5ff' },
  BREAKOUT:       { label: '🚀 BREAKOUT', color: '#ffd700' },
  LIQUIDITY_TRAP: { label: '🪤 LIQ TRAP', color: '#bf5fff' },
  RANGE:          { label: '📊 RANGE',    color: '#8ec8e8' },
  MANUAL_TEST:    { label: '🧪 TEST',     color: '#4a7a99' },
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
  const isScalp  = trade.source === 'SCALP';

  const badge = SOURCE_BADGE[trade.source] || { label: trade.source, color: '#4a7a99' };

  // Distance from entry to stop as % of entry
  const stopDist = trade.direction === 'LONG'
    ? ((trade.currentPrice - trade.stopPrice) / trade.entryPrice) * 100
    : ((trade.stopPrice - trade.currentPrice) / trade.entryPrice) * 100;

  // ── Scalp target progress: 0.3% = entry zone, 0.6% = full target ──
  // Shows how far into the expected move the trade currently is
  const SCALP_TARGET_LOW  = 0.3;  // % unleveraged price move
  const SCALP_TARGET_HIGH = 0.6;
  const pnlUnlev = Math.abs(pnl) / (trade.leverage || 10); // convert back to price %
  const scalpProgress = Math.min((pnlUnlev / SCALP_TARGET_HIGH) * 100, 100);
  const scalpTargetColor = pnlUnlev >= SCALP_TARGET_HIGH
    ? '#ffd700'   // hit full target
    : pnlUnlev >= SCALP_TARGET_LOW
    ? '#00ff88'   // in target zone
    : '#00f5ff';  // building toward target

  // AI score colour
  const aiColor = (trade.aiScore || 0) >= 80
    ? '#00ff88' : (trade.aiScore || 0) >= 60
    ? '#ffd700' : '#8ec8e8';

  return (
    <div style={{
      margin: '6px 10px',
      padding: '10px 12px',
      background: '#071520',
      border: `1px solid ${pnl >= 0 ? '#00ff8822' : '#ff336622'}`,
      borderRadius: 3,
      // Left accent bar — cyan for scalp, source colour for others
      borderLeft: `3px solid ${badge.color}`,
    }}>

      {/* ── Row 1: Direction · Symbol · Source badge · HTF · Age ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>

        {/* LONG / SHORT tag */}
        <span className={`tag tag-${trade.direction.toLowerCase()}`}>{trade.direction}</span>

        {/* Symbol */}
        <span style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 12, fontWeight: 700,
          color: '#e0f4ff', letterSpacing: 1,
        }}>{trade.symbol}</span>

        {/* Source badge */}
        <span style={{
          fontSize: 8, fontFamily: "'Orbitron', sans-serif",
          color: badge.color,
          background: `${badge.color}15`,
          border: `1px solid ${badge.color}44`,
          padding: '2px 7px', borderRadius: 2, letterSpacing: 1,
        }}>{badge.label}</span>

        {/* HTF trend — only show for scalps where it means something */}
        {trade.htfTrend && (
          <span style={{
            fontSize: 8, fontFamily: "'Share Tech Mono', monospace",
            color: trade.htfTrend === 'LONG'
              ? '#00ff88' : trade.htfTrend === 'SHORT'
              ? '#ff3366' : '#4a7a99',
            background: '#071520',
            border: `1px solid ${trade.htfTrend === 'LONG' ? '#00ff8833' : trade.htfTrend === 'SHORT' ? '#ff336633' : '#0d2a3d'}`,
            padding: '1px 5px', borderRadius: 2,
          }}>1H:{trade.htfTrend}</span>
        )}

        {/* AI score */}
        {(trade.aiScore || 0) > 0 && (
          <span style={{
            fontSize: 8, fontFamily: "'Share Tech Mono', monospace",
            color: aiColor,
          }}>AI:{trade.aiScore}%</span>
        )}

        {/* Age */}
        <span style={{ fontSize: 9, color: '#4a7a99', marginLeft: 'auto' }}>
          {age}m ago
        </span>
      </div>

      {/* ── Row 2: Entry · Current · Stop ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
        <MiniStat label="ENTRY"   value={`$${trade.entryPrice?.toFixed(4)}`} />
        <MiniStat label="CURRENT" value={`$${(trade.currentPrice || trade.entryPrice)?.toFixed(4)}`} highlight />
        <MiniStat label="STOP"    value={`$${trade.stopPrice?.toFixed(4)}`} dim />
      </div>

      {/* ── Row 3: PnL · Leverage · Qty · Bar · Close ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 16, fontWeight: 900,
          color: pnlColor,
          textShadow: `0 0 14px ${pnlColor}`,
          minWidth: 70,
        }}>
          {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
        </div>
        <span style={{ fontSize: 9, color: '#8ec8e8' }}>{trade.leverage}x</span>
        <span style={{ fontSize: 9, color: '#4a7a99' }}>QTY {trade.quantity}</span>

        {/* Trailing stop buffer bar */}
        <div style={{ flex: 1, height: 3, background: '#0d2a3d', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width:  `${Math.max(0, Math.min(100, stopDist * 5))}%`,
            height: '100%',
            background: pnlColor,
            transition: 'width 0.5s ease',
          }} />
        </div>

        {/* Close button */}
        <button
          className="btn btn-red"
          onClick={() => onClose(trade.id)}
          style={{ padding: '4px 10px', fontSize: 9, flexShrink: 0 }}
        >
          CLOSE
        </button>
      </div>

      {/* ── Row 4 (SCALP only): Target progress bar ── */}
      {isScalp && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{
              fontSize: 7, fontFamily: "'Orbitron',sans-serif",
              color: '#4a7a99', letterSpacing: 1,
            }}>
              SCALP TARGET · {SCALP_TARGET_LOW}%–{SCALP_TARGET_HIGH}% MOVE
            </span>
            <span style={{
              fontSize: 8, fontFamily: "'Share Tech Mono',monospace",
              color: scalpTargetColor,
            }}>
              {pnlUnlev >= SCALP_TARGET_HIGH
                ? '✓ TARGET HIT'
                : pnlUnlev >= SCALP_TARGET_LOW
                ? `IN ZONE · ${pnlUnlev.toFixed(3)}%`
                : `${pnlUnlev.toFixed(3)}% / ${SCALP_TARGET_LOW}%`}
            </span>
          </div>
          <div style={{ height: 3, background: '#0d2a3d', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
            {/* Target zone markers */}
            <div style={{
              position: 'absolute', top: 0, bottom: 0,
              left: `${(SCALP_TARGET_LOW / SCALP_TARGET_HIGH) * 100}%`,
              width: 1, background: '#00ff8844',
            }} />
            {/* Progress fill */}
            <div style={{
              width: `${scalpProgress}%`, height: '100%',
              background: scalpTargetColor,
              borderRadius: 2,
              transition: 'width 0.5s ease',
              boxShadow: pnlUnlev >= SCALP_TARGET_LOW ? `0 0 4px ${scalpTargetColor}` : 'none',
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, highlight, dim }: {
  label: string; value: string; highlight?: boolean; dim?: boolean;
}) {
  return (
    <div>
      <div style={{
        fontSize: 8, color: '#4a7a99',
        fontFamily: "'Orbitron', sans-serif", letterSpacing: 1,
        marginBottom: 2,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 11, fontFamily: "'Share Tech Mono', monospace",
        color: highlight ? '#00f5ff' : dim ? '#8ec8e8' : '#e0f4ff',
      }}>
        {value}
      </div>
    </div>
  );
}
