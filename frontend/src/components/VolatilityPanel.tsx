// components/VolatilityPanel.tsx — BB squeeze, ATR compression, expansion probability
// FIX: Uses fixed-position Tooltip so labels never clip inside overflow containers.

import React from 'react';
import Tooltip from './Tooltip';

interface Props { botStatus: any; }

export default function VolatilityPanel({ botStatus }: Props) {
  const cache = botStatus?.analysisCache || {};

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title">
        <span className="dot" style={{ background: '#bf5fff' }} />
        VOLATILITY PREDICTOR
        <Tooltip text="Detects Bollinger Band squeeze + ATR compression + volume contraction. When all three compress together, a big breakout move is imminent." />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {Object.keys(cache).length === 0 ? (
          <div style={{ padding: 14, textAlign: 'center', color: '#4a7a99', fontSize: 10, fontFamily: "'Share Tech Mono',monospace" }}>
            Waiting for analysis cycle…
          </div>
        ) : (
          Object.entries(cache).map(([pair, data]: any) => {
            const prob   = data.expansionProbability ?? 0;
            const regime = data.regime || 'UNKNOWN';
            const bbW    = data.bbWidth   ?? 0;
            const atrR   = data.atrRatio  ?? 1;
            const volR   = data.volumeRatio ?? 1;
            const pColor = prob >= 80 ? '#ff3366' : prob >= 60 ? '#ffd700' : prob >= 40 ? '#00f5ff' : '#8ec8e8';
            const rColor = regime === 'COMPRESSION' ? '#00f5ff' : regime === 'EXPANSION' ? '#ffd700' : regime === 'TREND' ? '#00ff88' : '#8ec8e8';

            return (
              <div key={pair} style={{ padding: '10px 14px', borderBottom: '1px solid #0d2a3d' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#ffffff', flex: 1 }}>{pair}</span>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: rColor, border: `1px solid ${rColor}44`, padding: '2px 7px', borderRadius: 2, letterSpacing: 1 }}>
                    {regime}
                  </span>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 7, fontFamily: "'Orbitron',sans-serif", color: '#4a7a99', letterSpacing: 2 }}>EXPANSION PROB</span>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, color: pColor, fontWeight: 700 }}>{prob}%</span>
                  </div>
                  <div style={{ height: 6, background: '#0d2a3d', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${prob}%`, height: '100%', background: pColor, borderRadius: 3, boxShadow: prob > 60 ? `0 0 8px ${pColor}` : 'none', transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  <MiniGauge label="BB WIDTH"  value={bbW}     max={0.1} color="#bf5fff" fmt={(v: number) => v.toFixed(4)} tooltip="Bollinger Band width. Below 0.025 = squeeze active (big move imminent). The lower the number, the tighter the coil." />
                  <MiniGauge label="ATR RATIO" value={atrR}    max={2}   color="#00f5ff" fmt={(v: number) => v.toFixed(2)} inverted tooltip="Recent ATR vs 20-period average ATR. Below 0.8 = volatility compressed. Above 1.3 = volatility expanding fast." />
                  <MiniGauge label="VOL RATIO" value={volR??1} max={2}   color="#ffd700" fmt={(v: number) => v.toFixed(2)} inverted tooltip="Recent volume vs 20-period average. Below 0.8 = volume drying up. Usually precedes a strong directional move." />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function MiniGauge({ label, value, max, color, fmt, inverted, tooltip }: any) {
  const pct = Math.min((value / max) * 100, 100);
  const bar = inverted ? 100 - pct : pct;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 7, fontFamily: "'Orbitron',sans-serif", color: '#4a7a99', letterSpacing: 1, whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <Tooltip text={tooltip} />
      </div>
      <div style={{ height: 3, background: '#0d2a3d', borderRadius: 2, marginBottom: 2 }}>
        <div style={{ width: `${bar}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color }}>{fmt(value)}</span>
    </div>
  );
}
