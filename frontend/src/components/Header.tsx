// components/Header.tsx — Top HUD bar

import React from 'react';

interface Props {
  wsStatus: 'connecting' | 'connected' | 'disconnected';
  balance:  number;
  running:  boolean;
  onStart:  () => void;
  onStop:   () => void;
}

export default function Header({ wsStatus, balance, running, onStart, onStop }: Props) {
  const wsColor = wsStatus === 'connected' ? '#00ff88' : wsStatus === 'connecting' ? '#ffd700' : '#ff3366';
  const now = new Date().toLocaleTimeString('en-US', { hour12: false });

  return (
    <header style={{
      background: '#050f1a',
      borderBottom: '1px solid #0d2a3d',
      padding: '0 20px',
      height: 52,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      flexShrink: 0,
    }}>
      {/* Top glow line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, #00f5ff88, transparent)',
      }} />

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: 900,
          fontSize: 16,
          letterSpacing: 4,
          color: '#00f5ff',
          textShadow: '0 0 20px #00f5ff',
        }}>
          BINGX
        </div>
        <div style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 10,
          letterSpacing: 2,
          color: '#8ec8e8',
        }}>
          MICRO TRADER v1.0
        </div>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: running ? '#00ff88' : '#ff3366',
          boxShadow: `0 0 8px ${running ? '#00ff88' : '#ff3366'}`,
        }} />
      </div>

      {/* Center stats */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        <Stat label="BALANCE" value={`$${balance.toFixed(4)}`} color="#00f5ff" />
        <Stat label="STATUS" value={running ? 'ACTIVE' : 'STOPPED'} color={running ? '#00ff88' : '#ff3366'} />
        <Stat label="WS" value={wsStatus.toUpperCase()} color={wsColor} />
        <Stat label="UTC" value={now} color="#8ec8e8" />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          className="btn btn-green"
          onClick={onStart}
          disabled={running}
          style={{ opacity: running ? 0.4 : 1 }}
        >
          ▶ START
        </button>
        <button
          className="btn btn-red"
          onClick={onStop}
          disabled={!running}
          style={{ opacity: !running ? 0.4 : 1 }}
        >
          ■ STOP
        </button>
      </div>
    </header>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 9, fontFamily: "'Orbitron', sans-serif", letterSpacing: 2, color: '#4a7a99', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontFamily: "'Share Tech Mono', monospace", color, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}
