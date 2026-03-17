// components/SignalQueuePanel.tsx — Signal queue with age display and expiry warning

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
}

interface Props { signals: Signal[]; }

export default function SignalQueuePanel({ signals }: Props) {
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
          signals.map((sig, i) => <SignalRow key={`${sig.symbol}-${sig.direction}-${i}`} signal={sig} rank={i} />)
        )}
      </div>
    </div>
  );
}

function SignalRow({ signal, rank }: { signal: Signal; rank: number }) {
  const color  = signal.direction === 'LONG' ? '#00ff88' : '#ff3366';

  // Age bar: 0–10min mapped to 100–0% green, turns red as it nears expiry
  const agePct    = Math.min((signal.ageSeconds / 600) * 100, 100); // 600s = 10min TTL
  const barColor  = agePct > 80 ? '#ff3366' : agePct > 60 ? '#ffd700' : '#00ff88';
  const timeLeft  = Math.max(0, 600 - signal.ageSeconds);
  const tlLabel   = timeLeft > 60 ? `${Math.floor(timeLeft / 60)}m left` : `${timeLeft}s left`;

  return (
    <div style={{
      padding: '8px 12px',
      borderBottom: '1px solid #0d2a3d',
      background: signal.expiresSoon ? '#ff336608' : 'transparent',
      borderLeft: signal.expiresSoon ? '2px solid #ff336655' : '2px solid transparent',
    }}>
      {/* Row 1: rank + symbol + direction + age */}
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
        {/* Age label — red when expiring soon */}
        <span style={{
          fontFamily: "'Share Tech Mono', monospace", fontSize: 9,
          color:  signal.expiresSoon ? '#ff3366' : '#4a7a99',
        }}>
          {signal.ageLabel} old
        </span>
      </div>

      {/* Row 2: strength bar + source + price */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: '#4a7a99', minWidth: 28 }}>
          {signal.source}
        </span>
        <div style={{ flex: 1, height: 3, background: '#0d2a3d', borderRadius: 2 }}>
          <div style={{ width: `${signal.strength}%`, height: '100%', background: color, borderRadius: 2 }} />
        </div>
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color, minWidth: 28, textAlign: 'right' }}>
          {signal.strength}%
        </span>
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: '#8ec8e8', minWidth: 60, textAlign: 'right' }}>
          ${signal.price?.toFixed(2)}
        </span>
        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: '#4a7a99' }}>
          {signal.leverage}x
        </span>
      </div>

      {/* Row 3: TTL countdown bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7, color: '#4a7a99', letterSpacing: 1 }}>
            EXECUTE WINDOW
          </span>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: barColor }}>
            {tlLabel}
          </span>
        </div>
        <div style={{ height: 2, background: '#0d2a3d', borderRadius: 2 }}>
          <div style={{
            width: `${100 - agePct}%`,
            height: '100%',
            background: barColor,
            borderRadius: 2,
            transition: 'width 1s linear, background 0.5s ease',
          }} />
        </div>
      </div>
    </div>
  );
}
