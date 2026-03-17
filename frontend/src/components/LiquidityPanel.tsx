// components/LiquidityPanel.tsx — Orderbook wall display

import React from 'react';
import Tooltip from './Tooltip';

interface Props { botStatus: any; symbol: string; }

export default function LiquidityPanel({ botStatus, symbol }: Props) {
  const cache = botStatus?.analysisCache || {};
  const data  = cache[symbol]?.liquidity || {};
  const bid   = data.bidWalls || [];
  const ask   = data.askWalls || [];
  const nearest = data.nearestWall;
  const dist    = data.wallDistance;

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title">
        <span className="dot" style={{ background: '#bf5fff' }} />
        LIQUIDITY HEATMAP
        <Tooltip text="Large orderbook clusters (walls) where price often pauses or reverses. Bid walls = support, Ask walls = resistance." />
        {dist != null && <span style={{ marginLeft: 'auto', fontSize: 9, color: '#8ec8e8', fontFamily: "'Share Tech Mono',monospace" }}>
          Nearest wall: {(dist * 100).toFixed(2)}% away
        </span>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {[...ask].reverse().map((w: any, i: number) => <WallRow key={`ask-${i}`} wall={w} side="ASK" />)}
        <div style={{ textAlign: 'center', padding: '4px 14px', fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: '#00f5ff', letterSpacing: 2, borderTop: '1px solid #0d2a3d44', borderBottom: '1px solid #0d2a3d44' }}>
          ─── CURRENT PRICE ───
        </div>
        {bid.map((w: any, i: number) => <WallRow key={`bid-${i}`} wall={w} side="BID" />)}
        {bid.length === 0 && ask.length === 0 && (
          <div style={{ padding: 14, textAlign: 'center', color: '#4a7a99', fontSize: 10, fontFamily: "'Share Tech Mono',monospace" }}>
            No significant walls detected
          </div>
        )}
      </div>
    </div>
  );
}

function WallRow({ wall, side }: { wall: any; side: 'BID'|'ASK' }) {
  const color = side === 'BID' ? '#00ff88' : '#ff3366';
  const maxSize = 10000;
  const barW = Math.min((wall.size / maxSize) * 100, 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderBottom: '1px solid #0d2a3d22' }}>
      <span style={{ fontSize: 8, fontFamily: "'Orbitron',sans-serif", color, minWidth: 24, letterSpacing: 1 }}>{side}</span>
      <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#ffffff', minWidth: 80 }}>
        ${wall.price?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
      </span>
      <div style={{ flex: 1, height: 4, background: '#0d2a3d', borderRadius: 2 }}>
        <div style={{ width: `${barW}%`, height: '100%', background: color, borderRadius: 2, opacity: 0.7 }} />
      </div>
      <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: '#8ec8e8', minWidth: 50, textAlign: 'right' }}>
        {wall.size?.toFixed(2)}
      </span>
    </div>
  );
}
