// components/SignalQueuePanel.tsx — Signal queue with SCALP signals shown separately
// ADDITIONS: SCALP signals shown in cyan section, strategic signals in separate section

import React from 'react';

interface Signal {
  symbol:      string;
  direction:   'LONG' | 'SHORT';
  strength:    number;
  source:      string;
  price:       number;
  leverage:    number;
  ageLabel:    string;
  ageSeconds:  number;
  expiresSoon: boolean;
  htfTrend?:  string;
}

interface Props { signals: Signal[]; }

// ── NEW: Source color config ──────────────────────────────────
const SOURCE_COLOR: Record<string, string> = {
  SCALP:          '#00f5ff',
  BREAKOUT:       '#ffd700',
  LIQUIDITY_TRAP: '#bf5fff',
  RANGE:          '#8ec8e8',
  MANUAL_TEST:    '#4a7a99',
};

export default function SignalQueuePanel({ signals }: Props) {
  // ── NEW: split scalp vs strategic ─────────────────────────
  const scalpSignals    = signals.filter(s => s.source === 'SCALP');
  const strategicSignals = signals.filter(s => s.source !== 'SCALP');

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title">
        <span className="dot" style={{ animationDelay: '0.5s' }} />
        SIGNAL QUEUE
        <span style={{ marginLeft: 'auto', color: '#4a7a99', fontSize: 9 }}>
          {signals.length} PENDING · 10m TTL · 30m PURGE
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {signals.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: '#4a7a99', fontSize: 11, fontFamily: "'Share Tech Mono', monospace" }}>
            QUEUE EMPTY
          </div>
        ) : (
          <>
            {/* ── NEW: Scalp signals section ── */}
            {scalpSignals.length > 0 && (
              <>
                <div style={{
                  padding: '4px 12px', fontSize: 8,
                  fontFamily: "'Orbitron', sans-serif",
                  letterSpacing: 2, color: '#00f5ff',
                  background: '#00f5ff0a',
                  borderBottom: '1px solid #00f5ff22',
                }}>
                  ⚡ SCALPING · {scalpSignals.length} signal{scalpSignals.length > 1 ? 's' : ''} today
                </div>
                {scalpSignals.map((sig, i) => (
                  <SignalRow key={`scalp-${i}`} signal={sig} rank={i} />
                ))}
              </>
            )}

            {/* ── Strategic signals section ── */}
            {strategicSignals.length > 0 && (
              <>
                {scalpSignals.length > 0 && (
                  <div style={{
                    padding: '4px 12px', fontSize: 8,
                    fontFamily: "'Orbitron', sans-serif",
                    letterSpacing: 2, color: '#ffd700',
                    background: '#ffd7000a',
                    borderBottom: '1px solid #ffd70022',
                  }}>
                    📡 STRATEGIC SCAN · waiting
                  </div>
                )}
                {strategicSignals.map((sig, i) => (
                  <SignalRow key={`strat-${i}`} signal={sig} rank={scalpSignals.length + i} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SignalRow({ signal, rank }: { signal: Signal; rank: number }) {
  const srcColor = SOURCE_COLOR[signal.source] || '#8ec8e8';
  const dirColor = signal.direction === 'LONG' ? '#00ff88' : '#ff3366';

  const agePct   = Math.min((signal.ageSeconds / 600) * 100, 100);
  const barColor = agePct > 80 ? '#ff3366' : agePct > 60 ? '#ffd700' : '#00ff88';
  const timeLeft = Math.max(0, 600 - signal.ageSeconds);
  const tlLabel  = timeLeft > 60 ? `${Math.floor(timeLeft / 60)}m left` : `${timeLeft}s left`;

  return (
    <div style={{
      padding: '8px 12px',
      borderBottom: '1px solid #0d2a3d',
      background: signal.expiresSoon ? '#ff336608' : 'transparent',
      borderLeft: `2px solid ${srcColor}44`,
    }}>
      {/* Row 1 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: '#4a7a99', minWidth: 16 }}>
          #{rank + 1}
        </span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#ffffff', flex: 1 }}>
          {signal.symbol}
        </span>
        <span className={`tag tag-${signal.direction.toLowerCase()}`} style={{ fontSize: 8 }}>
          {signal.direction}
        </span>
        {/* ── NEW: source badge ── */}
        <span style={{
          fontSize: 8, fontFamily: "'Orbitron', sans-serif",
          color: srcColor, background: `${srcColor}18`,
          border: `1px solid ${srcColor}44`,
          padding: '1px 5px', borderRadius: 2,
        }}>
          {signal.source === 'LIQUIDITY_TRAP' ? 'LIQ' : signal.source}
        </span>
        {/* ── NEW: HTF trend for scalps ── */}
        {signal.htfTrend && (
          <span style={{ fontSize: 8, color: signal.htfTrend === 'LONG' ? '#00ff88' : signal.htfTrend === 'SHORT' ? '#ff3366' : '#4a7a99', fontFamily: "'Share Tech Mono', monospace" }}>
            1H:{signal.htfTrend}
          </span>
        )}
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: signal.expiresSoon ? '#ff3366' : '#4a7a99' }}>
          {signal.ageLabel} old
        </span>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <div style={{ flex: 1, height: 3, background: '#0d2a3d', borderRadius: 2 }}>
          <div style={{ width: `${signal.strength}%`, height: '100%', background: dirColor, borderRadius: 2 }} />
        </div>
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: dirColor, minWidth: 28, textAlign: 'right' }}>
          {signal.strength}%
        </span>
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: '#8ec8e8', minWidth: 60, textAlign: 'right' }}>
          ${signal.price?.toFixed(2)}
        </span>
        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: '#4a7a99' }}>
          {signal.leverage}x
        </span>
      </div>

      {/* Row 3: TTL */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7, color: '#4a7a99', letterSpacing: 1 }}>EXECUTE WINDOW</span>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: barColor }}>{tlLabel}</span>
        </div>
        <div style={{ height: 2, background: '#0d2a3d', borderRadius: 2 }}>
          <div style={{ width: `${100 - agePct}%`, height: '100%', background: barColor, borderRadius: 2, transition: 'width 1s linear' }} />
        </div>
      </div>
    </div>
  );
}
