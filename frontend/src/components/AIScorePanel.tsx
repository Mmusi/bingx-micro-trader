// components/AIScorePanel.tsx — Per-pair AI probability scores

import React from 'react';
import Tooltip from './Tooltip';

interface Props { botStatus: any; }

export default function AIScorePanel({ botStatus }: Props) {
  const cache = botStatus?.analysisCache || {};

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title">
        <span className="dot" />
        AI SIGNAL SCORES
        <Tooltip text="AI probability score for each pair. Only signals ≥65% are queued. Score combines RSI, volume, liquidity, funding, pattern, and BB width." />
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {Object.keys(cache).length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: '#4a7a99', fontSize: 10, fontFamily: "'Share Tech Mono',monospace" }}>Waiting for first analysis cycle…</div>
        ) : (
          Object.entries(cache).map(([pair, data]: any) => {
            const regime = data.regime || '—';
            const prob   = data.expansionProbability ?? 0;
            const rColor = regime === 'COMPRESSION' ? '#00f5ff' : regime === 'EXPANSION' ? '#ffd700' : regime === 'TREND' ? '#00ff88' : '#8ec8e8';
            return (
              <div key={pair} style={{ padding: '8px 14px', borderBottom: '1px solid #0d2a3d' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#ffffff', flex: 1 }}>{pair}</span>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: rColor, letterSpacing: 1, border: `1px solid ${rColor}44`, padding: '1px 6px', borderRadius: 2 }}>{regime}</span>
                  <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: data.funding === 'LONG' ? '#00ff88' : data.funding === 'SHORT' ? '#ff3366' : '#4a7a99' }}>
                    FUND:{data.funding || '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <SmallStat label="BB WIDTH"   value={data.bbWidth != null  ? data.bbWidth.toFixed(4)  : '—'} />
                  <SmallStat label="EXP PROB"   value={`${prob}%`}           color={prob>60?'#ffd700':prob>80?'#ff3366':'#8ec8e8'} />
                  <SmallStat label="SUP"         value={data.range?.support     ? `$${data.range.support.toFixed(0)}`     : '—'} color="#00ff88" />
                  <SmallStat label="RES"         value={data.range?.resistance  ? `$${data.range.resistance.toFixed(0)}`  : '—'} color="#ff3366" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SmallStat({ label, value, color = '#8ec8e8' }: any) {
  return (
    <div>
      <div style={{ fontSize: 7, fontFamily: "'Orbitron',sans-serif", color: '#4a7a99', letterSpacing: 1, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 10, fontFamily: "'Share Tech Mono',monospace", color }}>{value}</div>
    </div>
  );
}
