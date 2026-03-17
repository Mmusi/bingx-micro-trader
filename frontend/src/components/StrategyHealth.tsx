// components/StrategyHealth.tsx — Win rate, profit factor, health status

import React from 'react';
import Tooltip from './Tooltip';

interface Props { botStatus: any; }

export default function StrategyHealth({ botStatus }: Props) {
  const stats  = botStatus?.riskStats  || {};
  const wins   = stats.wins   || 0;
  const losses = stats.losses || 0;
  const total  = wins + losses;
  const wr     = total > 0 ? (wins / total * 100) : 0;
  const pnl    = parseFloat(stats.total_pnl || stats.dailyProfit || 0);
  const loss   = parseFloat(stats.dailyLoss || 0);
  const pf     = loss > 0 ? (pnl / loss).toFixed(2) : pnl > 0 ? '∞' : '—';

  const health = wr >= 60 && parseFloat(pf) >= 1.5 ? 'HEALTHY'
               : wr >= 45 || parseFloat(pf) >= 1   ? 'CAUTION'
               : total === 0                        ? 'NO DATA'
               : 'INVESTIGATE';
  const hColor = health === 'HEALTHY' ? '#00ff88' : health === 'CAUTION' ? '#ffd700' : health === 'NO DATA' ? '#4a7a99' : '#ff3366';

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title">
        <span className="dot" style={{ background: hColor }} />
        STRATEGY HEALTH
        <Tooltip text="Today's performance. Green = healthy. Yellow = borderline. Red = investigate." />
        <span style={{ marginLeft: 'auto', fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: hColor, letterSpacing: 1 }}>{health}</span>
      </div>
      <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <Chip label="WIN RATE (today)" value={total > 0 ? `${wr.toFixed(1)}%` : '—'} color={wr>=60?'#00ff88':wr>=45?'#ffd700':'#ff3366'} tooltip="% profitable trades today" />
        <Chip label="PROFIT FACTOR"   value={pf}                                       color={parseFloat(pf)>=1.5?'#00ff88':parseFloat(pf)>=1?'#ffd700':'#ff3366'} tooltip="Gross profit / gross loss" />
        <Chip label="TODAY TRADES"    value={String(total)}                             color="#8ec8e8" tooltip="Total closed trades today" />
        <Chip label="DAILY PnL"       value={`${pnl>=0?'+':''}${pnl.toFixed(4)}`}      color={pnl>=0?'#00ff88':'#ff3366'} tooltip="Net profit/loss today in USD" />
        <Chip label="DAILY LOSS"      value={`$${loss.toFixed(4)}`}                    color="#ff3366" tooltip="Total losses today" />
        <Chip label="AI MIN SCORE"    value={`${65}%`} color="#00f5ff" tooltip="Minimum AI probability for trade entry" />
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
      <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 13, color, fontWeight: 700 }}>{value}</span>
    </div>
  );
}
