// components/CompoundingPanel.tsx — Micro-compounding tracker

import React from 'react';
import Tooltip from './Tooltip';

interface Props { botStatus: any; }

export default function CompoundingPanel({ botStatus }: Props) {
  const c      = botStatus?.compounding || {};
  const gain   = parseFloat(c.totalGainPct  || 0);
  const dd     = parseFloat(c.drawdownFromPeak || 0);
  const alloc  = c.currentAllocation || 40;
  const target = 10; // daily target %
  const riskStats = botStatus?.riskStats || {};
  const profitPct = parseFloat(riskStats.profitTargetPct || 0);
  const paused    = riskStats.profitTargetPaused;

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title">
        <span className="dot" />
        MICRO COMPOUNDING
        <Tooltip text="Tracks session growth and adjusts position sizing as balance compounds. Pauses entries when daily profit target is hit." />
        {paused && <span style={{ marginLeft: 8, fontSize: 8, color: '#ffd700', fontFamily: "'Orbitron',sans-serif", animation: 'pulse 1s infinite' }}>🎯 TARGET HIT</span>}
      </div>

      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Daily profit target bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 8, fontFamily: "'Orbitron',sans-serif", letterSpacing: 2, color: '#4a7a99' }}>
              DAILY TARGET
              <Tooltip text={`Bot pauses when daily profit reaches ${target}%. Breakout trades with AI score ≥${80} can still execute.`} />
            </span>
            <span style={{ fontSize: 10, fontFamily: "'Share Tech Mono',monospace", color: paused ? '#ffd700' : profitPct >= target * 0.8 ? '#ffd700' : '#00ff88' }}>
              {profitPct}% / {target}%
            </span>
          </div>
          <div style={{ height: 6, background: '#0d2a3d', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min((profitPct / target) * 100, 100)}%`, height: '100%', background: paused ? '#ffd700' : profitPct >= target * 0.8 ? '#ffd700' : '#00ff88', borderRadius: 3, transition: 'width 0.5s ease' }} />
          </div>
          {paused && (
            <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: '#ffd700', fontFamily: "'Share Tech Mono',monospace" }}>Normal entries paused — breakout override active</span>
              <button className="btn btn-yellow" style={{ padding: '2px 8px', fontSize: 8 }}
                onClick={() => fetch('http://localhost:4000/api/bot/resume-profit-pause', { method: 'POST' })}>
                RESUME
              </button>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Chip label="SESSION GAIN"  value={`${gain >= 0 ? '+' : ''}${gain}%`} color={gain >= 0 ? '#00ff88' : '#ff3366'} tooltip="Total % gain since bot started this session" />
          <Chip label="DD FROM PEAK"  value={`${dd}%`}                           color={dd > 10 ? '#ff3366' : dd > 5 ? '#ffd700' : '#8ec8e8'} tooltip="Drawdown from session peak balance" />
          <Chip label="POSITION SIZE" value={`${alloc}%`}                        color="#00f5ff" tooltip="Current dynamic position allocation. Increases as balance grows." />
          <Chip label="START BAL"     value={`$${(c.sessionStartBalance || 0).toFixed(4)}`} color="#8ec8e8" tooltip="Balance when bot was last started" />
        </div>
      </div>
    </div>
  );
}

function Chip({ label, value, color, tooltip }: any) {
  return (
    <div style={{ background: '#071520', border: '1px solid #0d2a3d', borderRadius: 2, padding: '7px 9px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 7, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1.5, color: '#4a7a99' }}>{label}</span>
        <Tooltip text={tooltip} />
      </div>
      <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 13, color }}>{value}</span>
    </div>
  );
}
