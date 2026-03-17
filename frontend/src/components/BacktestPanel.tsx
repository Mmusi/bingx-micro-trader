// components/BacktestPanel.tsx — Manual + auto backtest runner and results

import React, { useState, useEffect } from 'react';
import Tooltip from './Tooltip';

const PAIRS = ['BTC-USDT','SOL-USDT','AVAX-USDT','SUI-USDT','LINK-USDT','APT-USDT'];

export default function BacktestPanel() {
  const [result,   setResult]   = useState<any>(null);
  const [running,  setRunning]  = useState(false);
  const [symbol,   setSymbol]   = useState('BTC-USDT');
  const [days,     setDays]     = useState(30);
  const [lastAuto, setLastAuto] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:4000/api/backtest/result').then(r=>r.json()).then(d => { if (!d.message) setResult(d); }).catch(()=>{});
    fetch('http://localhost:4000/api/backtest/status').then(r=>r.json()).then(d => { setLastAuto(d.scheduledAt); setRunning(d.isRunning); }).catch(()=>{});
  }, []);

  const run = async () => {
    setRunning(true); setResult(null);
    try {
      const r = await fetch('http://localhost:4000/api/backtest/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, days }),
      });
      setResult(await r.json());
    } catch(e: any) { setResult({ error: e.message }); }
    setRunning(false);
  };

  const wr = result ? parseFloat(result.winRate) : null;
  const wrColor = wr == null ? '#8ec8e8' : wr >= 60 ? '#00ff88' : wr >= 45 ? '#ffd700' : '#ff3366';

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title">
        <span className="dot" style={{ background: running ? '#ffd700' : undefined }} />
        BACKTEST
        <Tooltip text="Simulates the strategy on historical candles without placing real orders. Auto-runs at 2AM daily." />
        {lastAuto && <span style={{ marginLeft: 'auto', fontSize: 8, color: '#4a7a99' }}>Last auto: {new Date(lastAuto).toLocaleTimeString()}</span>}
      </div>

      {/* Controls */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #0d2a3d', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={symbol} onChange={e=>setSymbol(e.target.value)} style={{ background: '#071520', border: '1px solid #0d2a3d', color: '#8ec8e8', padding: '4px 8px', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, borderRadius: 2 }}>
          {PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={days} onChange={e=>setDays(Number(e.target.value))} style={{ background: '#071520', border: '1px solid #0d2a3d', color: '#8ec8e8', padding: '4px 8px', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, borderRadius: 2 }}>
          {[7,14,30,60].map(d => <option key={d} value={d}>{d}d</option>)}
        </select>
        <button className="btn btn-cyan" onClick={run} disabled={running} style={{ padding: '4px 14px', fontSize: 9, opacity: running ? 0.5 : 1 }}>
          {running ? '⏳ RUNNING…' : '▶ RUN BACKTEST'}
        </button>
        <span style={{ fontSize: 9, color: '#4a7a99', fontFamily: "'Share Tech Mono',monospace" }}>
          Auto-runs at 02:00 AM daily
        </span>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        {running && (
          <div style={{ textAlign: 'center', padding: 20, color: '#ffd700', fontFamily: "'Orbitron',sans-serif", fontSize: 10, letterSpacing: 2 }}>
            SIMULATING STRATEGY…
          </div>
        )}
        {result && !running && !result.error && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <Metric label="WIN RATE"      value={result.winRate}      color={wrColor} tooltip="% of trades that were profitable" />
              <Metric label="PROFIT FACTOR" value={result.profitFactor} color={parseFloat(result.profitFactor)>1?'#00ff88':'#ff3366'} tooltip="Total wins / total losses. >1 is profitable" />
              <Metric label="MAX DRAWDOWN"  value={result.maxDrawdown}  color="#ff3366" tooltip="Largest peak-to-trough drop during simulation" />
              <Metric label="TOTAL GAIN"    value={result.totalGain}    color={parseFloat(result.totalGain)>0?'#00ff88':'#ff3366'} tooltip="Total % return on starting capital" />
              <Metric label="TRADES"        value={String(result.trades)} color="#8ec8e8" tooltip="Total simulated trades" />
              <Metric label="FINAL BAL"     value={result.finalBalance} color="#00f5ff" tooltip="Simulated ending balance" />
            </div>
            <div style={{ fontSize: 9, color: '#4a7a99', marginBottom: 8, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1 }}>
              LAST 10 SIMULATED TRADES
            </div>
            {(result.recentTrades || []).slice(-10).map((t: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '3px 0', borderBottom: '1px solid #0d2a3d22', fontSize: 9, fontFamily: "'Share Tech Mono',monospace" }}>
                <span style={{ color: t.direction==='LONG'?'#00ff88':'#ff3366', minWidth: 36 }}>{t.direction}</span>
                <span style={{ color: '#8ec8e8', flex: 1 }}>${t.entry} → ${t.exit}</span>
                <span style={{ color: t.pnlPct>=0?'#00ff88':'#ff3366', minWidth: 48, textAlign: 'right' }}>{t.pnlPct>=0?'+':''}{t.pnlPct}%</span>
                <span style={{ color: '#4a7a99', minWidth: 40 }}>{t.reason}</span>
              </div>
            ))}
            <div style={{ marginTop: 8, fontSize: 9, color: '#4a7a99', fontFamily: "'Share Tech Mono',monospace" }}>
              Run: {new Date(result.runAt).toLocaleString()} · {result.symbol} · {result.days}d
            </div>
          </>
        )}
        {result?.error && (
          <div style={{ color: '#ff3366', fontSize: 10, fontFamily: "'Share Tech Mono',monospace", padding: 8 }}>Error: {result.error}</div>
        )}
        {!result && !running && (
          <div style={{ textAlign: 'center', color: '#4a7a99', fontSize: 10, padding: 20, fontFamily: "'Share Tech Mono',monospace" }}>
            No backtest run yet. Press RUN BACKTEST or wait for 2 AM auto-run.
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, color, tooltip }: any) {
  return (
    <div style={{ background: '#071520', border: '1px solid #0d2a3d', borderRadius: 2, padding: '8px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, letterSpacing: 2, color: '#4a7a99' }}>{label}</span>
        <Tooltip text={tooltip} />
      </div>
      <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 14, color, fontWeight: 700 }}>{value}</span>
    </div>
  );
}
