// components/RiskPanel.tsx — Risk monitor with profit target + daily loss

import React from 'react';
import Tooltip from './Tooltip';

interface Props { botStatus: any; }

export default function RiskPanel({ botStatus }: Props) {
  const risk    = botStatus?.riskStats || {};
  const paused  = botStatus?.paused || risk.profitTargetPaused;
  const profPct = parseFloat(risk.profitTargetPct  || 0);
  const lossPct = parseFloat(risk.lossTargetPct    || 0);
  const MAX_LOSS = 20;
  const TARGET   = 10;

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title">
        <span className="dot" style={{ background: paused ? '#ffd700' : undefined }} />
        RISK MONITOR
        <Tooltip text="Daily profit target pauses normal entries at 10%. Daily loss limit halts all trading at 20%. Breakout exceptions allowed above 80 AI score." />
        {paused && (
          <span style={{ marginLeft: 8, fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: '#ffd700', letterSpacing: 2, animation: 'pulse 1s ease-in-out infinite' }}>
            {risk.profitTargetPaused ? '🎯 PROFIT TARGET HIT' : '⚠ PAUSED'}
          </span>
        )}
      </div>

      <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Daily profit target */}
        <GaugeRow
          label="DAILY PROFIT TARGET"
          value={profPct}
          max={TARGET}
          color={profPct >= TARGET ? '#ffd700' : profPct >= TARGET * 0.8 ? '#ffd700' : '#00ff88'}
          format={() => `${profPct.toFixed(2)}% / ${TARGET}%`}
          tooltip="When 10% daily profit reached, bot pauses normal entries. Breakout override still active."
        />

        {/* Daily loss limit */}
        <GaugeRow
          label="DAILY DRAWDOWN"
          value={lossPct}
          max={MAX_LOSS}
          color={lossPct >= MAX_LOSS ? '#ff3366' : lossPct >= MAX_LOSS * 0.75 ? '#ffd700' : '#8ec8e8'}
          format={() => `${lossPct.toFixed(2)}% / ${MAX_LOSS}%`}
          tooltip="If daily loss reaches 20% of starting balance, all trading stops until tomorrow."
        />

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <QuickStat label="START BAL"   value={`$${(risk.dailyStartBalance || 0).toFixed(4)}`} />
          <QuickStat label="DAILY PROFIT" value={`$${(risk.dailyProfit || 0).toFixed(4)}`} color="#00ff88" />
          <QuickStat label="DAILY LOSS"   value={`$${(risk.dailyLoss   || 0).toFixed(4)}`} color="#ff3366" />
          <QuickStat label="ACTIVE"       value={`${(botStatus?.activeTrades || []).length}/2`} />
          <QuickStat label="QUEUE DEPTH"  value={String((botStatus?.queue || []).length)} />
          <QuickStat label="BREAKOUT OVR" value={risk.profitTargetPaused ? 'ARMED' : 'STANDBY'} color={risk.profitTargetPaused ? '#ffd700' : '#4a7a99'} />
        </div>
      </div>
    </div>
  );
}

function GaugeRow({ label, value, max, color, format, tooltip }: any) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, letterSpacing: 2, color: '#4a7a99' }}>{label}</span>
          <Tooltip text={tooltip} />
        </div>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color }}>{format(value)}</span>
      </div>
      <div style={{ height: 5, background: '#0d2a3d', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, boxShadow: pct > 80 ? `0 0 6px ${color}` : 'none', borderRadius: 2, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

function QuickStat({ label, value, color = '#8ec8e8' }: any) {
  return (
    <div style={{ background: '#071520', border: '1px solid #0d2a3d', borderRadius: 2, padding: '6px 8px' }}>
      <div style={{ fontSize: 7, fontFamily: "'Orbitron',sans-serif", letterSpacing: 2, color: '#4a7a99', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 12, color }}>{value}</div>
    </div>
  );
}
