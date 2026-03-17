// components/TickerStrip.tsx — Horizontal live price ticker bar

import React, { useEffect, useRef, useState } from 'react';
import { marketAPI } from '../services/api';

const PAIRS = ['BTC-USDT', 'SOL-USDT', 'AVAX-USDT', 'SUI-USDT', 'LINK-USDT', 'APT-USDT'];

interface Props { priceMap: Record<string, number>; }

export default function TickerStrip({ priceMap }: Props) {
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>({});
  const [flash, setFlash]           = useState<Record<string, 'up' | 'down' | null>>({});

  useEffect(() => {
    const changes: Record<string, 'up' | 'down' | null> = {};
    let hasChange = false;
    for (const pair of PAIRS) {
      const curr = priceMap[pair];
      const prev = prevPrices[pair];
      if (curr && prev && curr !== prev) {
        changes[pair] = curr > prev ? 'up' : 'down';
        hasChange = true;
      }
    }
    if (hasChange) {
      setFlash(changes);
      setPrevPrices({ ...priceMap });
      setTimeout(() => setFlash({}), 400);
    }
  }, [priceMap]); // eslint-disable-line

  return (
    <div style={{
      background:   '#050f1a',
      borderBottom: '1px solid #0d2a3d',
      display:      'flex',
      alignItems:   'center',
      gap:          0,
      overflowX:    'auto',
      flexShrink:   0,
      height:       32,
    }}>
      {PAIRS.map((pair, i) => {
        const price     = priceMap[pair];
        const direction = flash[pair];
        const color     = direction === 'up' ? '#00ff88' : direction === 'down' ? '#ff3366' : '#8ec8e8';

        return (
          <React.Fragment key={pair}>
            {i > 0 && (
              <div style={{ width: 1, height: 16, background: '#0d2a3d', flexShrink: 0 }} />
            )}
            <div style={{
              display:    'flex',
              alignItems: 'center',
              gap:        8,
              padding:    '0 16px',
              flexShrink: 0,
            }}>
              <span style={{
                fontFamily:    "'Orbitron', sans-serif",
                fontSize:      8,
                letterSpacing: 1,
                color:         '#4a7a99',
              }}>
                {pair.replace('-USDT', '')}
              </span>
              <span style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize:   11,
                color,
                transition: 'color 0.1s',
                textShadow: direction ? `0 0 8px ${color}` : 'none',
                minWidth:   70,
              }}>
                {price
                  ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                  : '—'
                }
              </span>
              {direction && (
                <span style={{
                  fontSize: 8,
                  color,
                  fontFamily: "'Share Tech Mono', monospace",
                }}>
                  {direction === 'up' ? '▲' : '▼'}
                </span>
              )}
            </div>
          </React.Fragment>
        );
      })}

      {/* Right-side engine indicator */}
      <div style={{ marginLeft: 'auto', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 4, height: 4, borderRadius: '50%',
          background: '#00f5ff',
          boxShadow:  '0 0 6px #00f5ff',
          animation:  'pulse 1s ease-in-out infinite',
        }} />
        <span style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize:   8,
          color:      '#4a7a99',
          letterSpacing: 2,
        }}>
          LIVE
        </span>
      </div>
    </div>
  );
}
