// components/StrategyToggles.tsx — Enable/disable engines

import React, { useEffect, useState } from 'react';
import Tooltip from './Tooltip';

const ENGINE_INFO: Record<string, string> = {
  RANGE:       'Range engine: buys support, sells resistance during sideways markets.',
  BREAKOUT:    'Breakout engine: trades momentum when price closes outside the range with volume.',
  LIQUIDITY:   'Liquidity engine: detects orderbook walls and fake breakouts (stop hunts).',
  LIQUIDATION: 'Liquidation engine: estimates where leveraged traders will be forced out.',
  VOLATILITY:  'Volatility predictor: detects BB squeeze and ATR compression before big moves.',
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

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title"><span className="dot" />STRATEGY ENGINES</div>
      <div style={{ flex: 1, padding: '6px 0' }}>
        {Object.entries(engines).map(([name, on]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', borderBottom: '1px solid #0d2a3d' }}>
            <div onClick={() => toggle(name)} style={{ width: 32, height: 16, borderRadius: 8, background: on ? '#00ff8833' : '#0d2a3d', border: `1px solid ${on ? '#00ff88' : '#1a3040'}`, cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}>
              <div style={{ position: 'absolute', top: 2, left: on ? 17 : 2, width: 10, height: 10, borderRadius: '50%', background: on ? '#00ff88' : '#2a5570', transition: 'left 0.2s', boxShadow: on ? '0 0 6px #00ff88' : 'none' }} />
            </div>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, letterSpacing: 2, color: on ? '#ffffff' : '#4a7a99', flex: 1 }}>{name}</span>
            <span style={{ fontSize: 8, color: on ? '#00ff88' : '#ff3366', fontFamily: "'Share Tech Mono',monospace" }}>{on ? 'ON' : 'OFF'}</span>
            <Tooltip text={ENGINE_INFO[name] || ''} />
          </div>
        ))}
      </div>
    </div>
  );
}
