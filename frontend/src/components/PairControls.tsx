// components/PairControls.tsx — Enable/disable trading pairs

import React, { useEffect, useState } from 'react';
import { settingsAPI } from '../services/api';

interface PairConfig { enabled: boolean; minQty: number; }
interface PairMap { [key: string]: PairConfig; }

interface Props { priceMap: Record<string, number>; }

export default function PairControls({ priceMap }: Props) {
  const [pairs, setPairs] = useState<PairMap>({});

  useEffect(() => {
    settingsAPI.getPairs().then(r => setPairs(r.data)).catch(() => {});
  }, []);

  const toggle = async (pair: string) => {
    const updated = {
      ...pairs,
      [pair]: { ...pairs[pair], enabled: !pairs[pair].enabled },
    };
    setPairs(updated);
    try {
      await settingsAPI.updatePairs({ [pair]: { enabled: !pairs[pair].enabled } });
    } catch (_) {}
  };

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title">
        <span className="dot" style={{ animationDelay: '1s' }} />
        PAIRS
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {Object.entries(pairs).map(([pair, cfg]) => {
          const price = priceMap[pair];
          return (
            <div key={pair} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 12px',
              borderBottom: '1px solid #0d2a3d',
              cursor: 'pointer',
              background: cfg.enabled ? '#071520' : 'transparent',
              transition: 'background 0.15s',
            }}
              onClick={() => toggle(pair)}
            >
              {/* Toggle LED */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background:  cfg.enabled ? '#00ff88' : '#1a3040',
                boxShadow:   cfg.enabled ? '0 0 8px #00ff88' : 'none',
                flexShrink:  0,
                transition:  'all 0.2s',
              }} />

              {/* Pair name */}
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize:   11,
                color:      cfg.enabled ? '#e0f4ff' : '#4a7a99',
                flex:       1,
                transition: 'color 0.2s',
              }}>
                {pair}
              </div>

              {/* Live price */}
              <div style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize:   11,
                color:      '#8ec8e8',
              }}>
                {price ? `$${price.toFixed(2)}` : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
