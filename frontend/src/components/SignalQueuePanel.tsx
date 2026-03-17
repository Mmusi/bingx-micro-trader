// components/SignalQueuePanel.tsx
// Scalp signals shown in separate cyan section at top.
// Strategic signals below in yellow section.
// Each scalp row shows: HTF trend, vol ratio, scalp reason, TTL countdown.

import React from 'react';

interface Signal {
  symbol:       string;
  direction:    'LONG' | 'SHORT';
  strength:     number;
  source:       string;
  price:        number;
  leverage:     number;
  ageLabel:     string;
  ageSeconds:   number;
  expiresSoon:  boolean;
  htfTrend?:   string;
  scalpReason?: string;
  aiScore?:    number;
}

interface Props { signals: Signal[]; }

// Source accent colours
const SOURCE_COLOR: Record<string, string> = {
  SCALP:          '#00f5ff',
  BREAKOUT:       '#ffd700',
  LIQUIDITY_TRAP: '#bf5fff',
  RANGE:          '#8ec8e8',
  MANUAL_TEST:    '#4a7a99',
};

// Human-readable scalp reason labels
const SCALP_REASON_LABEL: Record<string, string> = {
  EMA9_CROSS_UP:    '⬆ EMA9 crossed above EMA21',
  EMA9_CROSS_DOWN:  '⬇ EMA9 crossed below EMA21',
  EMA_ALIGNED_BULL: '↗ EMA aligned bullish + 3 green candles',
  EMA_ALIGNED_BEAR: '↘ EMA aligned bearish + 3 red candles',
};

export default function SignalQueuePanel({ signals }: Props) {
  const scalpSignals    = signals.filter(s => s.source === 'SCALP');
  const strategicSignals = signals.filter(s => s.source !== 'SCALP');

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Panel header ── */}
      <div className="panel-title">
        <span className="dot" style={{ animationDelay: '0.5s' }} />
        SIGNAL QUEUE
        <span style={{ marginLeft: 'auto', color: '#4a7a99', fontSize: 9 }}>
          {signals.length} PENDING · 10m TTL · 30m PURGE
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {signals.length === 0 && (
          <div style={{
            padding: 20, textAlign: 'center',
            color: '#4a7a99', fontSize: 11,
            fontFamily: "'Share Tech Mono', monospace",
          }}>
            QUEUE EMPTY
          </div>
        )}

        {/* ══ SCALP section ════════════════════════════════════ */}
        {scalpSignals.length > 0 && (
          <>
            {/* Section header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 12px',
              background: '#00f5ff0d',
              borderBottom: '1px solid #00f5ff22',
            }}>
              <span style={{
                fontSize: 8, fontFamily: "'Orbitron',sans-serif",
                color: '#00f5ff', letterSpacing: 2,
              }}>⚡ SCALPING MODE</span>
              <span style={{
                fontSize: 8, fontFamily: "'Share Tech Mono',monospace",
                color: '#4a7a99',
              }}>· {scalpSignals.length} signal{scalpSignals.length > 1 ? 's' : ''}</span>
              <span style={{
                marginLeft: 'auto',
                fontSize: 7, fontFamily: "'Orbitron',sans-serif",
                color: '#00f5ff66', letterSpacing: 1,
              }}>10x · 1.5% STOP · 5m TF</span>
            </div>

            {scalpSignals.map((sig, i) => (
              <SignalRow key={`scalp-${i}`} signal={sig} rank={i} />
            ))}
          </>
        )}

        {/* ══ Strategic section ════════════════════════════════ */}
        {strategicSignals.length > 0 && (
          <>
            {/* Section header — only show divider if scalp section also visible */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 12px',
              background: scalpSignals.length > 0 ? '#ffd7000a' : 'transparent',
              borderBottom: '1px solid #ffd70022',
              borderTop: scalpSignals.length > 0 ? '1px solid #0d2a3d' : 'none',
            }}>
              <span style={{
                fontSize: 8, fontFamily: "'Orbitron',sans-serif",
                color: '#ffd700', letterSpacing: 2,
              }}>📡 STRATEGIC SCAN</span>
              <span style={{
                fontSize: 8, fontFamily: "'Share Tech Mono',monospace",
                color: '#4a7a99',
              }}>· {strategicSignals.length} queued</span>
            </div>

            {strategicSignals.map((sig, i) => (
              <SignalRow
                key={`strat-${sig.symbol}-${i}`}
                signal={sig}
                rank={scalpSignals.length + i}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── Individual signal row ──────────────────────────────────────
function SignalRow({ signal, rank }: { signal: Signal; rank: number }) {
  const isScalp    = signal.source === 'SCALP';
  const srcColor   = SOURCE_COLOR[signal.source] || '#8ec8e8';
  const dirColor   = signal.direction === 'LONG' ? '#00ff88' : '#ff3366';
  const aiColor    = (signal.aiScore || 0) >= 80 ? '#00ff88' : (signal.aiScore || 0) >= 60 ? '#ffd700' : '#8ec8e8';

  // TTL countdown (10-minute execute window)
  const agePct   = Math.min((signal.ageSeconds / 600) * 100, 100);
  const barColor = agePct > 80 ? '#ff3366' : agePct > 60 ? '#ffd700' : '#00ff88';
  const timeLeft = Math.max(0, 600 - signal.ageSeconds);
  const tlLabel  = timeLeft > 60
    ? `${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s`
    : `${timeLeft}s`;

  // HTF colour
  const htfColor = signal.htfTrend === 'LONG'
    ? '#00ff88' : signal.htfTrend === 'SHORT'
    ? '#ff3366' : '#4a7a99';

  return (
    <div style={{
      padding: '8px 12px',
      borderBottom: '1px solid #0d2a3d',
      background: signal.expiresSoon ? '#ff336606' : 'transparent',
      borderLeft: `2px solid ${srcColor}55`,
    }}>

      {/* ── Line 1: rank · symbol · direction · source · HTF · AI · age ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>

        <span style={{ fontSize: 9, color: '#4a7a99', fontFamily: "'Orbitron',sans-serif", minWidth: 18 }}>
          #{rank + 1}
        </span>

        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#ffffff', flex: 1 }}>
          {signal.symbol}
        </span>

        {/* Direction tag */}
        <span className={`tag tag-${signal.direction.toLowerCase()}`} style={{ fontSize: 8 }}>
          {signal.direction}
        </span>

        {/* Source badge */}
        <span style={{
          fontSize: 8, fontFamily: "'Orbitron',sans-serif",
          color: srcColor,
          background: `${srcColor}15`,
          border: `1px solid ${srcColor}44`,
          padding: '1px 6px', borderRadius: 2,
        }}>
          {signal.source === 'LIQUIDITY_TRAP' ? 'LIQ TRAP' : signal.source}
        </span>

        {/* HTF trend badge — always show for scalps */}
        {signal.htfTrend && (
          <span style={{
            fontSize: 8, fontFamily: "'Share Tech Mono',monospace",
            color: htfColor,
            border: `1px solid ${htfColor}44`,
            padding: '1px 5px', borderRadius: 2,
          }}>
            1H:{signal.htfTrend}
          </span>
        )}

        {/* AI score */}
        {(signal.aiScore || 0) > 0 && (
          <span style={{
            fontSize: 8, fontFamily: "'Share Tech Mono',monospace",
            color: aiColor,
          }}>
            AI:{signal.aiScore}%
          </span>
        )}

        {/* Age */}
        <span style={{
          fontSize: 9, fontFamily: "'Share Tech Mono',monospace",
          color: signal.expiresSoon ? '#ff3366' : '#4a7a99',
        }}>
          {signal.ageLabel}
        </span>
      </div>

      {/* ── Line 2 (SCALP): human-readable trigger reason ── */}
      {isScalp && signal.scalpReason && (
        <div style={{
          fontSize: 9, fontFamily: "'Share Tech Mono',monospace",
          color: '#00f5ffaa', marginBottom: 5,
          paddingLeft: 24,
        }}>
          {SCALP_REASON_LABEL[signal.scalpReason] || signal.scalpReason}
        </div>
      )}

      {/* ── Line 3: strength bar · price · leverage ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <span style={{
          fontSize: 7, fontFamily: "'Orbitron',sans-serif",
          color: '#4a7a99', letterSpacing: 1, minWidth: 36,
        }}>STR</span>
        <div style={{ flex: 1, height: 3, background: '#0d2a3d', borderRadius: 2 }}>
          <div style={{
            width: `${signal.strength}%`, height: '100%',
            background: dirColor, borderRadius: 2,
          }} />
        </div>
        <span style={{
          fontFamily: "'Share Tech Mono',monospace", fontSize: 9,
          color: dirColor, minWidth: 32, textAlign: 'right',
        }}>
          {signal.strength}%
        </span>
        <span style={{
          fontFamily: "'Share Tech Mono',monospace", fontSize: 9,
          color: '#8ec8e8', minWidth: 70, textAlign: 'right',
        }}>
          ${signal.price?.toLocaleString('en-US', { maximumFractionDigits: 4 })}
        </span>
        <span style={{
          fontFamily: "'Orbitron',sans-serif", fontSize: 8,
          color: '#4a7a99',
        }}>
          {signal.leverage}x
        </span>
      </div>

      {/* ── Line 4: TTL execute window countdown ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{
            fontSize: 7, fontFamily: "'Orbitron',sans-serif",
            color: '#4a7a99', letterSpacing: 1,
          }}>
            EXECUTE WINDOW
          </span>
          <span style={{
            fontSize: 8, fontFamily: "'Share Tech Mono',monospace",
            color: barColor,
          }}>
            {tlLabel} left
          </span>
        </div>
        <div style={{ height: 2, background: '#0d2a3d', borderRadius: 2 }}>
          <div style={{
            width: `${100 - agePct}%`,
            height: '100%', background: barColor,
            borderRadius: 2, transition: 'width 1s linear',
          }} />
        </div>
      </div>
    </div>
  );
}
