// components/StrategyToggles.tsx — Enable/disable engines
// ADDITION: SCALP engine toggle added

import React, { useEffect, useState } from 'react';
import Tooltip from './Tooltip';

const ENGINE_INFO: Record<string, string> = {
  RANGE:       'Range engine: buys support, sells resistance during sideways markets.',
  BREAKOUT:    'Breakout engine: trades momentum when price closes outside the range with volume.',
  LIQUIDITY:   'Liquidity engine: detects orderbook walls and fake breakouts (stop hunts).',
  LIQUIDATION: 'Liquidation engine: estimates where leveraged traders will be forced out.',
  VOLATILITY:  'Volatility predictor: detects BB squeeze and ATR compression before big moves.',
  // ── NEW ──
  SCALP:       'Scalp engine: EMA9/EMA21 crossover on 5m candles. Fires 5–15 signals/day. Uses multi-timeframe alignment (1H trend). 10x leverage, 1.5% stop. Target: 0.3–0.6% per trade. Runs when no strategic signal is active.',
};

// ── NEW: engine color accents ─────────────────────────────────
const ENGINE_COLOR: Record<string, string> = {
  SCALP:       '#00f5ff',
  BREAKOUT:    '#ffd700',
  LIQUIDITY:   '#bf5fff',
  LIQUIDATION: '#ff3366',
  VOLATILITY:  '#bf5fff',
  RANGE:       '#00ff88',
};

export default function StrategyToggles() {
  const [engines, setEngines] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('http://localhost:4000/api/engines').then(r=>r.json()).then(setEngines).catch(()=>{});
  }, []);

  const toggle = async (name: string) => {
    const next = !engines[name];
    setEngines(prev => ({ ...prev, [name]: next }));
    await fetch(`http://localhost:4000/api/engines/${name}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: next }),
    });
  };

  // ── NEW: show SCALP first, then existing engines ──────────
  const engineOrder = ['SCALP', 'RANGE', 'BREAKOUT', 'LIQUIDITY', 'LIQUIDATION', 'VOLATILITY'];
  const sortedEntries = engineOrder
    .filter(name => engines[name] !== undefined)
    .map(name => [name, engines[name]] as [string, boolean]);
  // also add any engines not in order list
  Object.entries(engines).forEach(([name, val]) => {
    if (!engineOrder.includes(name)) sortedEntries.push([name, val]);
  });

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title"><span className="dot" />STRATEGY ENGINES</div>
      <div style={{ flex: 1, padding: '6px 0' }}>
        {sortedEntries.map(([name, on]) => {
          const accent = ENGINE_COLOR[name] || '#00ff88';
          const isNew  = name === 'SCALP';
          return (
            <div key={name} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 14px', borderBottom: '1px solid #0d2a3d',
              // ── NEW: highlight SCALP row ──
              background: isNew && on ? `${accent}08` : 'transparent',
            }}>
              <div onClick={() => toggle(name)} style={{
                width: 32, height: 16, borderRadius: 8,
                background: on ? `${accent}33` : '#0d2a3d',
                border: `1px solid ${on ? accent : '#1a3040'}`,
                cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
              }}>
                <div style={{
                  position: 'absolute', top: 2, left: on ? 17 : 2,
                  width: 10, height: 10, borderRadius: '50%',
                  background: on ? accent : '#2a5570',
                  transition: 'left 0.2s',
                  boxShadow: on ? `0 0 6px ${accent}` : 'none',
                }} />
              </div>
              <span style={{
                fontFamily: "'Orbitron',sans-serif", fontSize: 9, letterSpacing: 2,
                color: on ? '#ffffff' : '#4a7a99', flex: 1,
              }}>{name}</span>

              {/* ── NEW: NEW badge for SCALP ── */}
              {isNew && (
                <span style={{
                  fontSize: 7, fontFamily: "'Orbitron',sans-serif",
                  color: accent, background: `${accent}22`,
                  border: `1px solid ${accent}55`,
                  padding: '1px 5px', borderRadius: 2, letterSpacing: 1,
                }}>NEW</span>
              )}

              <span style={{
                fontSize: 8,
                color: on ? accent : '#ff3366',
                fontFamily: "'Share Tech Mono',monospace",
              }}>{on ? 'ON' : 'OFF'}</span>
              <Tooltip text={ENGINE_INFO[name] || ''} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
