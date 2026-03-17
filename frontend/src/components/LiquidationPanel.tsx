// components/LiquidationPanel.tsx — Liquidation cluster zones

import React from 'react';
import Tooltip from './Tooltip';

interface Props { botStatus: any; symbol: string; }

export default function LiquidationPanel({ botStatus, symbol }: Props) {
  const cache   = botStatus?.analysisCache || {};
  const liqMap  = cache[symbol]?.liqMap || {};
  const price   = cache[symbol]?.price  || 0;
  const longs   = liqMap.longLiqZones   || [];
  const shorts  = liqMap.shortLiqZones  || [];

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title">
        <span className="dot" style={{ background: '#ffd700' }} />
        LIQUIDATION MAP
        <Tooltip text="Estimated zones where leveraged traders get force-liquidated. Price often accelerates through these zones. Orange = high density." />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        <SectionLabel label="SHORT LIQUIDATIONS (above price)" color="#ff3366" />
        {[...shorts].reverse().map((z: any, i: number) => (
          <ZoneRow key={`s${i}`} zone={z} color="#ff3366" currentPrice={price} />
        ))}
        <div style={{ textAlign: 'center', padding: '4px 14px', fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: '#00f5ff', letterSpacing: 2, background: '#071520' }}>
          ─── ${price?.toLocaleString('en-US', { maximumFractionDigits: 2 })} ───
        </div>
        <SectionLabel label="LONG LIQUIDATIONS (below price)" color="#00ff88" />
        {longs.map((z: any, i: number) => (
          <ZoneRow key={`l${i}`} zone={z} color="#00ff88" currentPrice={price} />
        ))}
        {longs.length === 0 && shorts.length === 0 && (
          <div style={{ padding: 14, textAlign: 'center', color: '#4a7a99', fontSize: 10, fontFamily: "'Share Tech Mono',monospace" }}>
            No data — bot must be running
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ label, color }: any) {
  return (
    <div style={{ padding: '4px 14px', fontSize: 7, fontFamily: "'Orbitron',sans-serif", letterSpacing: 2, color, background: `${color}0a`, borderBottom: '1px solid #0d2a3d' }}>
      {label}
    </div>
  );
}

function ZoneRow({ zone, color, currentPrice }: any) {
  const dist    = currentPrice > 0 ? Math.abs(zone.price - currentPrice) / currentPrice * 100 : 0;
  const density = zone.strength === 'HIGH' ? 100 : zone.strength === 'MEDIUM' ? 60 : zone.strength === 'SWING' ? 80 : 35;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderBottom: '1px solid #0d2a3d22' }}>
      <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#ffffff', minWidth: 85 }}>
        ${zone.price?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
      </span>
      <div style={{ flex: 1, height: 4, background: '#0d2a3d', borderRadius: 2 }}>
        <div style={{ width: `${density}%`, height: '100%', background: color, borderRadius: 2, opacity: 0.6 }} />
      </div>
      <span style={{ fontSize: 8, fontFamily: "'Orbitron',sans-serif", color, minWidth: 44, letterSpacing: 1 }}>
        {zone.leverage ? `${zone.leverage}x` : zone.strength}
      </span>
      <span style={{ fontSize: 9, color: '#4a7a99', fontFamily: "'Share Tech Mono',monospace", minWidth: 44, textAlign: 'right' }}>
        {dist.toFixed(2)}%
      </span>
    </div>
  );
}
