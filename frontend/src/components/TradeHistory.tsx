// components/TradeHistory.tsx — Closed trade history + daily stats

import React, { useEffect, useState } from 'react';
import { tradeAPI } from '../services/api';

interface HistoryTrade {
  id: number;
  pair: string;
  direction: string;
  entry_price: number;
  exit_price: number;
  leverage: number;
  profit: number;
  status: string;
  source: string;
  timestamp: number;
}

interface DailyStats {
  total: number;
  wins: number;
  losses: number;
  total_pnl: number;
}

export default function TradeHistory() {
  const [trades, setTrades]     = useState<HistoryTrade[]>([]);
  const [stats,  setStats]      = useState<DailyStats | null>(null);
  const [tab,    setTab]        = useState<'today' | 'all'>('today');

  useEffect(() => {
    tradeAPI.history(100).then(r => setTrades(r.data)).catch(() => {});
    tradeAPI.stats().then(r => setStats(r.data)).catch(() => {});

    const iv = setInterval(() => {
      tradeAPI.history(100).then(r => setTrades(r.data)).catch(() => {});
      tradeAPI.stats().then(r => setStats(r.data)).catch(() => {});
    }, 10_000);
    return () => clearInterval(iv);
  }, []);

  const todayTs  = Math.floor(new Date().setHours(0,0,0,0) / 1000);
  const filtered = tab === 'today'
    ? trades.filter(t => t.timestamp >= todayTs)
    : trades;

  const pnlColor = (v: number) => v > 0 ? '#00ff88' : v < 0 ? '#ff3366' : '#8ec8e8';

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title">
        <span className="dot" style={{ animationDelay: '1.5s' }} />
        TRADE HISTORY

        {/* Stats row */}
        {stats && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
            <StatChip label="W" value={String(stats.wins   || 0)} color="#00ff88" />
            <StatChip label="L" value={String(stats.losses || 0)} color="#ff3366" />
            <StatChip
              label="PNL"
              value={`${(stats.total_pnl || 0) >= 0 ? '+' : ''}${(stats.total_pnl || 0).toFixed(2)}%`}
              color={pnlColor(stats.total_pnl || 0)}
            />
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #0d2a3d' }}>
        {(['today', 'all'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background:  'transparent',
              border:      'none',
              borderBottom: tab === t ? '2px solid #00f5ff' : '2px solid transparent',
              color:        tab === t ? '#00f5ff' : '#4a7a99',
              padding:      '6px 16px',
              cursor:       'pointer',
              fontFamily:   "'Orbitron', sans-serif",
              fontSize:     9,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: -1,
              transition:   'all 0.15s',
            }}
          >
            {t === 'today' ? 'TODAY' : 'ALL TIME'}
          </button>
        ))}
      </div>

      {/* Trade list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: 20, textAlign: 'center',
            color: '#4a7a99', fontSize: 11,
            fontFamily: "'Share Tech Mono', monospace",
          }}>
            NO TRADES
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #0d2a3d' }}>
                {['PAIR', 'DIR', 'ENTRY', 'EXIT', 'LEV', 'PNL', 'SRC'].map(h => (
                  <th key={h} style={{
                    padding: '5px 8px', textAlign: 'left',
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 8, letterSpacing: 1,
                    color: '#4a7a99', fontWeight: 'normal',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #0d2a3d22' }}>
                  <td style={{ padding: '5px 8px', fontFamily: "'Space Mono', monospace", color: '#e0f4ff' }}>
                    {t.pair}
                  </td>
                  <td style={{ padding: '5px 8px' }}>
                    <span className={`tag tag-${t.direction?.toLowerCase()}`} style={{ fontSize: 8 }}>
                      {t.direction}
                    </span>
                  </td>
                  <td style={{ padding: '5px 8px', color: '#8ec8e8' }}>
                    ${t.entry_price?.toFixed(2)}
                  </td>
                  <td style={{ padding: '5px 8px', color: '#8ec8e8' }}>
                    {t.exit_price ? `$${t.exit_price?.toFixed(2)}` : '—'}
                  </td>
                  <td style={{ padding: '5px 8px', color: '#8ec8e8' }}>
                    {t.leverage}x
                  </td>
                  <td style={{ padding: '5px 8px', fontFamily: "'Share Tech Mono', monospace", color: pnlColor(t.profit || 0) }}>
                    {t.profit != null ? `${t.profit >= 0 ? '+' : ''}${t.profit.toFixed(2)}%` : '—'}
                  </td>
                  <td style={{ padding: '5px 8px', fontSize: 9, color: '#4a7a99' }}>
                    {t.source}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 8, color: '#4a7a99', fontFamily: "'Orbitron', sans-serif", letterSpacing: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 11, color, fontFamily: "'Share Tech Mono', monospace" }}>
        {value}
      </span>
    </div>
  );
}
