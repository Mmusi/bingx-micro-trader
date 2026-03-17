// components/StrategyToggles.tsx — Enable/disable strategy engines
// SCALP engine shown first with NEW badge + stats row showing today's scalp activity

import React, { useEffect, useState } from 'react';
import Tooltip from './Tooltip';

// ── Engine descriptions ────────────────────────────────────────
const ENGINE_INFO: Record<string, string> = {
  SCALP:       '⚡ NEW — EMA9/EMA21 crossover on 5m candles. Fires 5–15 signals/day. Requires 3 consecutive candles + volume above average + momentum body. Multi-timeframe filtered: only trades WITH the 1H trend. Always 10x leverage, 1.5% stop. Target: 0.3–0.6% per trade. Activates when no strategic signal exists.',
  RANGE:       'Range engine: buys near support when RSI oversold, sells near resistance when overbought. Requires price inside detected range + bullish/bearish candle pattern. AI threshold 60.',
  BREAKOUT:    'Breakout engine: enters when price closes outside range with volume spike + ATR expanding. Market order for speed. Can override daily profit target pause if AI score ≥ 80.',
  LIQUIDITY:   'Liquidity trap engine: detects equal highs/lows (stop hunt clusters) + wick rejection. Reverses direction against the fake breakout. AI threshold 65.',
  LIQUIDATION: 'Liquidation map engine: estimates forced-close zones for leveraged traders. Feeds into adaptive filter — blocks entry if liquidation cluster is within 1% of price.',
  VOLATILITY:  'Volatility predictor: detects Bollinger Band squeeze + ATR compression + volume contraction. Activates breakout engine early when expansion probability exceeds 60%.',
};

// ── Engine accent colours ──────────────────────────────────────
const ENGINE_COLOR: Record<string, string> = {
  SCALP:       '#00f5ff',
  RANGE:       '#00ff88',
  BREAKOUT:    '#ffd700',
  LIQUIDITY:   '#bf5fff',
  LIQUIDATION: '#ff3366',
  VOLATILITY:  '#8ec8e8',
};

// ── Engine display order ───────────────────────────────────────
const ENGINE_ORDER = ['SCALP', 'RANGE', 'BREAKOUT', 'LIQUIDITY', 'LIQUIDATION', 'VOLATILITY'];

// ── All known engines with safe defaults ──────────────────────
// This ensures SCALP always shows even if settings.js predates it
const ENGINE_DEFAULTS: Record<string, boolean> = {
  SCALP: true, RANGE: true, BREAKOUT: true,
  LIQUIDITY: true, LIQUIDATION: true, VOLATILITY: true,
};

interface Props {
  botStatus?: any; // optional — shows scalp activity stats
}

export default function StrategyToggles({ botStatus }: Props) {
  const [engines, setEngines] = useState<Record<string, boolean>>(ENGINE_DEFAULTS);

  useEffect(() => {
    fetch('http://localhost:4000/api/engines')
      .then(r => r.json())
      .then(data => {
        // Merge with defaults so new engines always appear
        setEngines({ ...ENGINE_DEFAULTS, ...data });
      })
      .catch(() => {});
  }, []);

  const toggle = async (name: string) => {
    const next = !engines[name];
    setEngines(prev => ({ ...prev, [name]: next }));
    await fetch(`http://localhost:4000/api/engines/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: next }),
    }).catch(() => {});
  };

  // Build sorted list — ORDER list first, then any extras
  const sortedEntries: [string, boolean][] = [
    ...ENGINE_ORDER
      .filter(name => engines[name] !== undefined)
      .map(name => [name, engines[name]] as [string, boolean]),
    ...Object.entries(engines)
      .filter(([name]) => !ENGINE_ORDER.includes(name)),
  ];

  // ── Scalp stats from botStatus ──────────────────────────────
  const queue        = botStatus?.queue || [];
  const activeTrades = botStatus?.activeTrades || [];
  const scalpQueued  = queue.filter((s: any) => s.source === 'SCALP').length;
  const scalpActive  = activeTrades.filter((t: any) => t.source === 'SCALP').length;

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title">
        <span className="dot" />
        STRATEGY ENGINES
        <Tooltip text="Toggle individual signal engines on or off. Changes take effect immediately without restarting the bot." />
      </div>

      {/* ── Scalp live stats bar (only shows when SCALP is ON) ── */}
      {engines['SCALP'] && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '6px 14px',
          background: '#00f5ff08',
          borderBottom: '1px solid #00f5ff22',
        }}>
          <span style={{
            fontSize: 8, fontFamily: "'Orbitron',sans-serif",
            color: '#00f5ff', letterSpacing: 2,
          }}>⚡ SCALP ENGINE</span>

          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
            <ScalpStat label="IN QUEUE" value={scalpQueued} color={scalpQueued > 0 ? '#00f5ff' : '#4a7a99'} />
            <ScalpStat label="ACTIVE"   value={scalpActive} color={scalpActive > 0 ? '#00ff88' : '#4a7a99'} />
            <span style={{
              fontSize: 8, fontFamily: "'Share Tech Mono',monospace",
              color: '#4a7a99',
            }}>10x LEV · 1.5% STOP · 5m TF</span>
          </div>
        </div>
      )}

      {/* ── Engine rows ─────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {sortedEntries.map(([name, on]) => {
          const accent = ENGINE_COLOR[name] || '#8ec8e8';
          const isScalp = name === 'SCALP';

          return (
            <div key={name} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px',
              borderBottom: '1px solid #0d2a3d',
              background: isScalp && on ? '#00f5ff05' : 'transparent',
              transition: 'background 0.2s',
            }}>

              {/* Toggle switch */}
              <div
                onClick={() => toggle(name)}
                style={{
                  width: 32, height: 16, borderRadius: 8, flexShrink: 0,
                  background: on ? `${accent}33` : '#0d2a3d',
                  border: `1px solid ${on ? accent : '#1a3040'}`,
                  cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 2,
                  left: on ? 17 : 2,
                  width: 10, height: 10, borderRadius: '50%',
                  background: on ? accent : '#2a5570',
                  transition: 'left 0.2s',
                  boxShadow: on ? `0 0 6px ${accent}` : 'none',
                }} />
              </div>

              {/* Engine name */}
              <span style={{
                fontFamily: "'Orbitron',sans-serif",
                fontSize: 9, letterSpacing: 2,
                color: on ? '#ffffff' : '#4a7a99',
                flex: 1,
              }}>{name}</span>

              {/* NEW badge — SCALP only */}
              {isScalp && (
                <span style={{
                  fontSize: 7, fontFamily: "'Orbitron',sans-serif",
                  color: accent, background: `${accent}22`,
                  border: `1px solid ${accent}55`,
                  padding: '1px 5px', borderRadius: 2, letterSpacing: 1,
                  flexShrink: 0,
                }}>NEW</span>
              )}

              {/* ON / OFF label */}
              <span style={{
                fontSize: 8, flexShrink: 0,
                color: on ? accent : '#ff3366',
                fontFamily: "'Share Tech Mono',monospace",
                minWidth: 22,
              }}>{on ? 'ON' : 'OFF'}</span>

              {/* Info tooltip */}
              <Tooltip text={ENGINE_INFO[name] || name} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScalpStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 7, fontFamily: "'Orbitron',sans-serif", color: '#4a7a99', letterSpacing: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 11, fontFamily: "'Share Tech Mono',monospace", color, fontWeight: 700 }}>
        {value}
      </span>
    </div>
  );
}
