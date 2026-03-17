// charts/TradingChart.tsx

import React, { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';

interface Trade {
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopPrice: number;
  currentPrice: number;
  profitPct: number;
}
interface Props {
  symbol: string;
  interval: string;
  currentPrice?: number;
  activeTrades?: Trade[];
}

// ── Indicators ────────────────────────────────────────────────
function calcEMA(src: number[], p: number) {
  const k = 2 / (p + 1); const out: number[] = []; let prev = src[0];
  src.forEach((v, i) => { prev = i === 0 ? v : v * k + prev * (1 - k); out.push(prev); });
  return out;
}
function calcBB(src: number[], p = 20, m = 2) {
  return src.map((_, i) => {
    if (i < p - 1) return null;
    const sl = src.slice(i - p + 1, i + 1);
    const mean = sl.reduce((a, b) => a + b, 0) / p;
    const sd = Math.sqrt(sl.reduce((s, v) => s + (v - mean) ** 2, 0) / p);
    return { u: mean + m * sd, m: mean, l: mean - m * sd };
  });
}
function calcRSI(src: number[], p = 14) {
  const out: number[] = new Array(p).fill(50);
  let ag = 0, al = 0;
  for (let i = 1; i <= p; i++) { const d = src[i] - src[i - 1]; d > 0 ? (ag += d) : (al -= d); }
  ag /= p; al /= p;
  out.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al));
  for (let i = p + 1; i < src.length; i++) {
    const d = src[i] - src[i - 1];
    ag = (ag * (p - 1) + Math.max(d, 0)) / p;
    al = (al * (p - 1) + Math.max(-d, 0)) / p;
    out.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al));
  }
  return out;
}
function calcSR(candles: any[]) {
  const w = candles.slice(-80); const ph: number[] = []; const pl: number[] = [];
  for (let i = 2; i < w.length - 2; i++) {
    if (w[i].high > w[i-1].high && w[i].high > w[i-2].high && w[i].high > w[i+1].high && w[i].high > w[i+2].high) ph.push(w[i].high);
    if (w[i].low  < w[i-1].low  && w[i].low  < w[i-2].low  && w[i].low  < w[i+1].low  && w[i].low  < w[i+2].low)  pl.push(w[i].low);
  }
  const avg = (a: number[]) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  return { sup: avg(pl.slice(-3)), res: avg(ph.slice(-3)) };
}

// ── Main component ────────────────────────────────────────────
export default function TradingChart({ symbol, interval, currentPrice, activeTrades = [] }: Props) {
  const mainDiv = useRef<HTMLDivElement>(null);
  const rsiDiv  = useRef<HTMLDivElement>(null);
  const state   = useRef<any>({});   // holds chart refs without causing re-renders
  const rawRef  = useRef<any[]>([]);
  const plRef   = useRef<any[]>([]);

  const [msg,     setMsg]     = useState('Initialising…');
  const [srState, setSR]      = useState<{ sup: number|null; res: number|null }>({ sup: null, res: null });
  const [rsiVal,  setRsiVal]  = useState<number|null>(null);

  // Build charts once on mount
  useEffect(() => {
    if (!mainDiv.current || !rsiDiv.current) return;
    const BASE: any = {
      layout:    { background: { color: '#050f1a' }, textColor: '#8ec8e8', fontFamily: "'Share Tech Mono', monospace", fontSize: 11 },
      grid:      { vertLines: { color: '#0d2a3d55' }, horzLines: { color: '#0d2a3d55' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#0d2a3d' },
      timeScale:       { borderColor: '#0d2a3d', timeVisible: true, secondsVisible: false },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale:  { mouseWheel: true, pinch: true },
    };

    const mc = createChart(mainDiv.current, { ...BASE, width: mainDiv.current.clientWidth, height: mainDiv.current.clientHeight });
    const rc = createChart(rsiDiv.current,  { ...BASE, width: rsiDiv.current.clientWidth,  height: rsiDiv.current.clientHeight });

    const sCandle = mc.addCandlestickSeries({ upColor: '#00ff88', downColor: '#ff3366', borderUpColor: '#00ff88', borderDownColor: '#ff3366', wickUpColor: '#00ff8866', wickDownColor: '#ff336666' });
    const sVol    = mc.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'vol' });
    mc.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    const sE20 = mc.addLineSeries({ color: '#00f5ff', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const sE50 = mc.addLineSeries({ color: '#ffd700', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const sBBU = mc.addLineSeries({ color: '#bf5fff66', lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false });
    const sBBM = mc.addLineSeries({ color: '#bf5fff44', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false });
    const sBBL = mc.addLineSeries({ color: '#bf5fff66', lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false });
    const sRSI = rc.addLineSeries({ color: '#ffd700', lineWidth: 2, priceLineVisible: false, lastValueVisible: true });
    sRSI.createPriceLine({ price: 70, color: '#ff336666', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false });
    sRSI.createPriceLine({ price: 30, color: '#00ff8866', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false });
    sRSI.createPriceLine({ price: 50, color: '#ffffff22', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false });

    mc.timeScale().subscribeVisibleLogicalRangeChange(r => { if (r) rc.timeScale().setVisibleLogicalRange(r); });
    rc.timeScale().subscribeVisibleLogicalRangeChange(r => { if (r) mc.timeScale().setVisibleLogicalRange(r); });

    state.current = { mc, rc, sCandle, sVol, sE20, sE50, sBBU, sBBM, sBBL, sRSI };

    const ro = new ResizeObserver(() => {
      if (mainDiv.current) mc.resize(mainDiv.current.clientWidth, mainDiv.current.clientHeight);
      if (rsiDiv.current)  rc.resize(rsiDiv.current.clientWidth,  rsiDiv.current.clientHeight);
    });
    if (mainDiv.current) ro.observe(mainDiv.current);
    if (rsiDiv.current)  ro.observe(rsiDiv.current);

    return () => { ro.disconnect(); mc.remove(); rc.remove(); state.current = {}; };
  }, []); // eslint-disable-line

  // Load data whenever symbol or interval changes
  useEffect(() => {
    const { sCandle, sVol, sE20, sE50, sBBU, sBBM, sBBL, sRSI, mc } = state.current;
    if (!sCandle) { setMsg('Chart not ready yet…'); return; }

    setMsg(`Loading ${symbol} ${interval}…`);

    fetch(`http://localhost:4000/api/market/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=200`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: any[]) => {
        if (!Array.isArray(data) || data.length < 3) {
          setMsg(`No candles returned (got: ${JSON.stringify(data).slice(0, 100)})`);
          return;
        }

        // Deduplicate and sort by time ascending
        const seen = new Set<number>();
        const candles = data
          .filter(c => { if (seen.has(c.time)) return false; seen.add(c.time); return true; })
          .sort((a, b) => a.time - b.time);

        rawRef.current = candles;
        const times  = candles.map(c => c.time as any);
        const closes = candles.map(c => Number(c.close));

        sCandle.setData(candles.map(c => ({ time: c.time as any, open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close) })));
        sVol.setData(candles.map(c => ({ time: c.time as any, value: Number(c.volume), color: Number(c.close) >= Number(c.open) ? '#00ff8828' : '#ff336628' })));

        const e20 = calcEMA(closes, 20);
        const e50 = calcEMA(closes, 50);
        sE20.setData(times.map((t: any, i: number) => ({ time: t, value: e20[i] })));
        sE50.setData(times.map((t: any, i: number) => ({ time: t, value: e50[i] })));

        const bbv = calcBB(closes, 20, 2);
        const bbData = bbv.map((v, i) => v ? { t: times[i], v } : null).filter(Boolean) as any[];
        sBBU.setData(bbData.map((x: any) => ({ time: x.t, value: x.v.u })));
        sBBM.setData(bbData.map((x: any) => ({ time: x.t, value: x.v.m })));
        sBBL.setData(bbData.map((x: any) => ({ time: x.t, value: x.v.l })));

        const rsiVals = calcRSI(closes, 14);
        sRSI.setData(times.map((t: any, i: number) => ({ time: t, value: rsiVals[i] })));
        setRsiVal(Math.round(rsiVals[rsiVals.length - 1]));

        // S/R lines
        plRef.current.forEach(pl => { try { sCandle.removePriceLine(pl); } catch (_) {} });
        plRef.current = [];
        const sr = calcSR(candles);
        setSR({ sup: sr.sup, res: sr.res });
        if (sr.sup != null) {
          plRef.current.push(sCandle.createPriceLine({ price: sr.sup, color: '#00ff88', lineWidth: 1, lineStyle: LineStyle.Dashed, title: '▶ SUPPORT',    axisLabelVisible: true }));
        }
        if (sr.res != null) {
          plRef.current.push(sCandle.createPriceLine({ price: sr.res, color: '#ff3366', lineWidth: 1, lineStyle: LineStyle.Dashed, title: '▶ RESISTANCE', axisLabelVisible: true }));
        }

        mc.timeScale().fitContent();
        setMsg(`✓ ${candles.length} candles`);
      })
      .catch((e: any) => {
        setMsg(`❌ ${e.message} — check backend is running`);
      });
  }, [symbol, interval]); // eslint-disable-line

  // Auto-refresh candles every 30s
  useEffect(() => {
    const id = setInterval(() => {
      const { sCandle, sVol, sRSI } = state.current;
      if (!sCandle) return;
      fetch(`http://localhost:4000/api/market/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=200`)
        .then(r => r.json())
        .then((data: any[]) => {
          if (!Array.isArray(data) || !data.length) return;
          const seen = new Set<number>();
          const candles = data.filter(c => { if (seen.has(c.time)) return false; seen.add(c.time); return true; }).sort((a, b) => a.time - b.time);
          rawRef.current = candles;
          sCandle.setData(candles.map(c => ({ time: c.time as any, open: +c.open, high: +c.high, low: +c.low, close: +c.close })));
          sVol.setData(candles.map(c => ({ time: c.time as any, value: +c.volume, color: +c.close >= +c.open ? '#00ff8828' : '#ff336628' })));
          const rsiVals = calcRSI(candles.map(c => +c.close), 14);
          sRSI.setData(candles.map((c, i) => ({ time: c.time as any, value: rsiVals[i] })));
          setRsiVal(Math.round(rsiVals[rsiVals.length - 1]));
          setMsg(`✓ ${candles.length} candles`);
        })
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, [symbol, interval]);

  // Live price tick
  useEffect(() => {
    const { sCandle } = state.current;
    if (!currentPrice || !sCandle || !rawRef.current.length) return;
    const last = rawRef.current[rawRef.current.length - 1];
    try {
      sCandle.update({ time: last.time as any, open: +last.open, high: Math.max(+last.high, currentPrice), low: Math.min(+last.low, currentPrice), close: currentPrice });
    } catch (_) {}
  }, [currentPrice]);

  // Trade level lines (entry + stop)
  useEffect(() => {
    const { sCandle } = state.current;
    if (!sCandle) return;
    // Remove old trade lines (keep first 2 = S/R)
    plRef.current.slice(2).forEach(pl => { try { sCandle.removePriceLine(pl); } catch (_) {} });
    plRef.current = plRef.current.slice(0, 2);
    for (const t of activeTrades) {
      const c = t.direction === 'LONG' ? '#00ff88' : '#ff3366';
      try {
        plRef.current.push(sCandle.createPriceLine({ price: t.entryPrice, color: c,           lineWidth: 2, lineStyle: LineStyle.Solid,  title: `● ${t.direction}`, axisLabelVisible: true }));
        plRef.current.push(sCandle.createPriceLine({ price: t.stopPrice,  color: '#ff336699', lineWidth: 1, lineStyle: LineStyle.Dashed, title: '✕ STOP',          axisLabelVisible: true }));
      } catch (_) {}
    }
  }, [activeTrades]);

  const rsiColor = rsiVal == null ? '#8ec8e8' : rsiVal > 65 ? '#ff3366' : rsiVal < 35 ? '#00ff88' : '#ffd700';

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#050f1a' }}>

      {/* Legend bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '5px 14px', background: '#071520', borderBottom: '1px solid #0d2a3d', flexShrink: 0, flexWrap: 'wrap', minHeight: 30 }}>
        <Leg color="#00f5ff" label="EMA 20" />
        <Leg color="#ffd700" label="EMA 50" />
        <Leg color="#bf5fff" label="BB(20)" dot />
        {srState.sup != null && <Leg color="#00ff88" label={`SUP  $${srState.sup!.toFixed(2)}`}  dash />}
        {srState.res != null && <Leg color="#ff3366" label={`RES  $${srState.res!.toFixed(2)}`} dash />}
        {activeTrades.map((t, i) => {
          const c   = t.direction === 'LONG' ? '#00ff88' : '#ff3366';
          const pnl = (t.profitPct || 0).toFixed(2);
          const dst = t.direction === 'LONG'
            ? (((t.currentPrice || t.entryPrice) - t.stopPrice) / t.entryPrice * 100).toFixed(2)
            : ((t.stopPrice - (t.currentPrice || t.entryPrice)) / t.entryPrice * 100).toFixed(2);
          return (
            <span key={i} style={{ fontSize: 10, color: c, background: `${c}15`, padding: '2px 8px', borderRadius: 2, border: `1px solid ${c}44`, fontFamily: "'Share Tech Mono', monospace" }}>
              {t.direction}  PnL {+pnl >= 0 ? '+' : ''}{pnl}%  ·  {dst}% to STOP
            </span>
          );
        })}
        <span style={{ marginLeft: 'auto', fontSize: 9, color: '#4a7a99', fontFamily: "'Share Tech Mono', monospace" }}>{msg}</span>
        {rsiVal != null && (
          <span style={{ fontSize: 10, color: rsiColor, fontFamily: "'Orbitron', sans-serif", letterSpacing: 1 }}>
            RSI {rsiVal}&nbsp;<span style={{ fontSize: 8, color: '#4a7a99' }}>{rsiVal > 65 ? 'OVERBOUGHT' : rsiVal < 35 ? 'OVERSOLD' : 'NEUTRAL'}</span>
          </span>
        )}
      </div>

      {/* Main candle + indicator chart */}
      <div ref={mainDiv} style={{ flex: '0 0 74%', width: '100%', minHeight: 0 }} />

      {/* RSI divider label */}
      <div style={{ padding: '2px 14px', background: '#071520', borderTop: '1px solid #0d2a3d', flexShrink: 0 }}>
        <span style={{ fontSize: 8, fontFamily: "'Orbitron', sans-serif", letterSpacing: 2, color: '#4a7a99' }}>RSI (14)   30 = oversold · 70 = overbought</span>
      </div>

      {/* RSI sub-chart */}
      <div ref={rsiDiv} style={{ flex: '0 0 26%', width: '100%', minHeight: 0 }} />
    </div>
  );
}

function Leg({ color, label, dash, dot }: { color: string; label: string; dash?: boolean; dot?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {dot
        ? <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${color}`, flexShrink: 0 }} />
        : <div style={{ width: 18, height: 0, borderTop: dash ? `2px dashed ${color}` : `2px solid ${color}`, flexShrink: 0 }} />
      }
      <span style={{ fontSize: 10, color: '#8ec8e8', fontFamily: "'Share Tech Mono', monospace", whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}
