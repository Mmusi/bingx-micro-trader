// pages/Dashboard.tsx — Full dashboard
// CHANGE: passes botStatus to StrategyToggles so scalp live stats bar works

import React, { useEffect, useState } from 'react';
import Header            from '../components/Header';
import TickerStrip       from '../components/TickerStrip';
import ChartPanel        from '../components/ChartPanel';
import TradeMonitor      from '../components/TradeMonitor';
import SignalQueuePanel  from '../components/SignalQueuePanel';
import PairControls      from '../components/PairControls';
import TradeHistory      from '../components/TradeHistory';
import RiskPanel         from '../components/RiskPanel';
import StrategyToggles   from '../components/StrategyToggles';
import BacktestPanel     from '../components/BacktestPanel';
import StrategyHealth    from '../components/StrategyHealth';
import AIScorePanel      from '../components/AIScorePanel';
import CompoundingPanel  from '../components/CompoundingPanel';
import LiquidityPanel    from '../components/LiquidityPanel';
import LiquidationPanel  from '../components/LiquidationPanel';
import VolatilityPanel   from '../components/VolatilityPanel';
import { useWebSocket }  from '../hooks/useWebSocket';
import { botAPI, accountAPI } from '../services/api';

type Tab = 'OVERVIEW' | 'INTELLIGENCE' | 'BACKTEST' | 'SETTINGS';
const WS_URL = `ws://${window.location.hostname}:4000/ws`;

export default function Dashboard() {
  const { status: wsStatus, priceMap, botStatus } = useWebSocket(WS_URL);
  const [balance,   setBalance]  = useState(0);
  const [activeTab, setTab]      = useState<Tab>('OVERVIEW');
  const [chartSym,  setChartSym] = useState('BTC-USDT');

  useEffect(() => {
    accountAPI.balance()
      .then(r => {
        const bal  = r.data?.balance;
        const usdt = Array.isArray(bal) ? bal.find((b: any) => b.asset === 'USDT') : bal;
        setBalance(parseFloat(usdt?.balance || usdt?.availableMargin || 0));
      }).catch(() => {});
  }, []);
  useEffect(() => { if (botStatus?.balance) setBalance(botStatus.balance); }, [botStatus?.balance]);

  const handleStart  = () => botAPI.start().catch(console.error);
  const handleStop   = () => botAPI.stop().catch(console.error);
  const handlePause  = () => fetch('http://localhost:4000/api/bot/pause',  { method: 'POST' });
  const handleResume = () => fetch('http://localhost:4000/api/bot/resume', { method: 'POST' });

  const activeTrades = botStatus?.activeTrades || [];
  const queue        = botStatus?.queue        || [];
  const running      = botStatus?.running      ?? false;
  const paused       = botStatus?.paused       ?? false;
  const TABS: Tab[]  = ['OVERVIEW', 'INTELLIGENCE', 'BACKTEST', 'SETTINGS'];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'#030b12' }}>
      <Header wsStatus={wsStatus} balance={balance} running={running} onStart={handleStart} onStop={handleStop} />
      <TickerStrip priceMap={priceMap} />

      {/* Tab bar */}
      <div style={{ display:'flex', background:'#050f1a', borderBottom:'1px solid #0d2a3d', flexShrink:0, alignItems:'center', padding:'0 14px', gap:4 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background:'transparent', border:'none',
            borderBottom: activeTab===t ? '2px solid #00f5ff' : '2px solid transparent',
            color: activeTab===t ? '#00f5ff' : '#4a7a99',
            padding:'7px 16px', cursor:'pointer',
            fontFamily:"'Orbitron',sans-serif", fontSize:9, letterSpacing:2,
            textTransform:'uppercase', transition:'all 0.15s',
          }}>{t}</button>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          {running && !paused && <button className="btn btn-yellow" style={{ padding:'3px 12px', fontSize:8 }} onClick={handlePause}>⏸ PAUSE</button>}
          {running &&  paused && <button className="btn btn-green"  style={{ padding:'3px 12px', fontSize:8 }} onClick={handleResume}>▶ RESUME</button>}
          <button className="btn btn-cyan" style={{ padding:'3px 12px', fontSize:8 }}
            onClick={() => fetch('http://localhost:4000/api/bot/test-signal', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ symbol: chartSym, direction:'LONG' }) })}>
            🧪 TEST
          </button>
        </div>
      </div>

      {/* OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 300px', gridTemplateRows:'1fr 200px', gap:6, padding:6, minHeight:0, overflow:'hidden' }}>
          <div style={{ minHeight:0 }}>
            <ChartPanel priceMap={priceMap} botStatus={botStatus} onSymbolChange={setChartSym} />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6, minHeight:0, overflow:'hidden' }}>
            <div style={{ flex:'0 0 auto', maxHeight:230 }}><TradeMonitor trades={activeTrades} onClose={() => {}} /></div>
            <div style={{ flex:'0 0 auto', maxHeight:190 }}><SignalQueuePanel signals={queue} /></div>
            <div style={{ flex:1, minHeight:0 }}><PairControls priceMap={priceMap} /></div>
          </div>
          <div style={{ minHeight:0, overflow:'hidden' }}><TradeHistory /></div>
          <div style={{ minHeight:0 }}><RiskPanel botStatus={botStatus} /></div>
        </div>
      )}

      {/* INTELLIGENCE */}
      {activeTab === 'INTELLIGENCE' && (
        <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gridTemplateRows:'1fr 1fr', gap:6, padding:6, minHeight:0, overflow:'hidden' }}>
          <VolatilityPanel  botStatus={botStatus} />
          <LiquidityPanel   botStatus={botStatus} symbol={chartSym} />
          <LiquidationPanel botStatus={botStatus} symbol={chartSym} />
          <AIScorePanel     botStatus={botStatus} />
          <CompoundingPanel botStatus={botStatus} />
          <StrategyHealth   botStatus={botStatus} />
        </div>
      )}

      {/* BACKTEST */}
      {activeTab === 'BACKTEST' && (
        <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 340px', gap:6, padding:6, minHeight:0, overflow:'hidden' }}>
          <BacktestPanel />
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <StrategyHealth   botStatus={botStatus} />
            <CompoundingPanel botStatus={botStatus} />
          </div>
        </div>
      )}

      {/* SETTINGS — StrategyToggles now receives botStatus for live scalp stats */}
      {activeTab === 'SETTINGS' && (
        <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, padding:6, minHeight:0, overflow:'hidden' }}>
          <StrategyToggles botStatus={botStatus} />
          <RiskPanel botStatus={botStatus} />
        </div>
      )}
    </div>
  );
}
