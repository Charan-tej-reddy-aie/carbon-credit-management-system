import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "../carbonx-intelligence.css";

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const number = (v) => Number(v || 0).toLocaleString("en-IN");

function PriceChart({ data }) {
  if (!data.length) return <div className="cx-empty"><span>↗</span><strong>No price history yet</strong><p>Market price records will appear here when data is available.</p></div>;
  const width = 900, height = 290, left = 48, right = 24, top = 28, bottom = 42;
  const values = data.map((d) => Number(d.average_price || 0));
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const x = (i) => left + (i * (width - left - right)) / Math.max(1, data.length - 1);
  const y = (v) => top + ((max - v) / range) * (height - top - bottom);
  const points = data.map((d, i) => `${x(i)},${y(Number(d.average_price || 0))}`).join(" ");
  const area = `${left},${height - bottom} ${points} ${x(data.length - 1)},${height - bottom}`;
  return <div className="cx-chart-wrap"><svg className="cx-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Historical carbon credit price chart">
    {[0, 1, 2, 3].map((n) => { const yy = top + n * (height - top - bottom) / 3; const val = max - n * range / 3; return <g key={n}><line x1={left} y1={yy} x2={width - right} y2={yy} className="cx-gridline"/><text x={left - 10} y={yy + 4} textAnchor="end" className="cx-axis-label">{Math.round(val)}</text></g>; })}
    <polygon points={area} className="cx-chart-area"/><polyline points={points} className="cx-chart-line"/>
    {data.map((d, i) => <circle key={`${d.recorded_at}-${i}`} cx={x(i)} cy={y(Number(d.average_price || 0))} r={data.length < 24 ? 4 : 2.5} className="cx-chart-dot"><title>{`${d.recorded_at}: ${money(d.average_price)}`}</title></circle>)}
    <text x={left} y={height - 12} className="cx-axis-label">{String(data[0]?.recorded_at || "").slice(0, 10)}</text><text x={width - right} y={height - 12} textAnchor="end" className="cx-axis-label">{String(data[data.length - 1]?.recorded_at || "").slice(0, 10)}</text>
  </svg></div>;
}

function MarketAnalytics() {
  const [history, setHistory] = useState([]); const [summary, setSummary] = useState(null); const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [horizon, setHorizon] = useState("30");
  const user = JSON.parse(localStorage.getItem("user") || "{}"); const canGenerate = ["ADMIN", "VERIFIER"].includes(user.role);
  const load = useCallback(async (quiet = false) => { if (quiet) setRefreshing(true); else setLoading(true); setError(""); try {
    const [h, s, p] = await Promise.all([api.get("/analytics/market"), api.get("/predictions/summary"), api.get("/analytics/predictions")]);
    setHistory((h.data.data || []).slice().reverse()); setSummary(s.data.data || null); setPredictions(p.data.data || []);
  } catch (e) { setError(e.response?.data?.message || "Could not load market analytics. Please try again."); } finally { setLoading(false); setRefreshing(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const latest = summary?.latest; const prediction = summary?.latest_prediction;
  const change = useMemo(() => prediction && Number(prediction.current_price) ? ((Number(prediction.predicted_price) - Number(prediction.current_price)) / Number(prediction.current_price)) * 100 : 0, [prediction]);
  const generate = async () => { setError(""); setMessage(""); try { const days = Number(horizon); if (!Number.isInteger(days) || days < 1 || days > 365) { setError("Choose a forecast horizon between 1 and 365 days."); return; } const r = await api.post("/predictions/generate", { horizon_days: days }); setMessage(`Forecast created for ${r.data.data.target_date} at ${money(r.data.data.predicted_price)}.`); await load(true); } catch (e) { setError(e.response?.data?.message || "Prediction generation failed."); } };
  return <main className="cx-intel-page">
    <header className="cx-intel-hero"><div><div className="cx-kicker"><span className="cx-kicker-dot"/> CARBONX INTELLIGENCE</div><h1>Market analytics</h1><p>Understand carbon-credit pricing, market balance, trading activity and forecast signals.</p></div><div className="cx-hero-actions"><button className="cx-button cx-button-ghost" onClick={() => load(true)} disabled={refreshing}>{refreshing ? "Refreshing…" : "↻ Refresh data"}</button>{canGenerate && <button className="cx-button cx-button-primary" onClick={generate}>Generate forecast <span>↗</span></button>}</div></header>
    {message && <div className="cx-notice cx-notice-success">✓ {message}</div>}{error && <div className="cx-notice cx-notice-error">{error}</div>}
    {loading ? <div className="cx-loading"><span className="cx-spinner"/> Loading market intelligence…</div> : <>
      <section className="cx-metric-grid">
        <article className="cx-metric-card cx-metric-primary"><div className="cx-metric-top"><span>Latest market price</span><span className="cx-metric-icon">₹</span></div><strong>{money(latest?.average_price)}</strong><small>Per carbon credit</small></article>
        <article className="cx-metric-card"><div className="cx-metric-top"><span>Market demand</span><span className="cx-metric-icon">↗</span></div><strong>{number(latest?.demand)}</strong><small>Credits demanded</small></article>
        <article className="cx-metric-card"><div className="cx-metric-top"><span>Available supply</span><span className="cx-metric-icon">◫</span></div><strong>{number(latest?.supply)}</strong><small>Credits supplied</small></article>
        <article className="cx-metric-card"><div className="cx-metric-top"><span>Trading volume</span><span className="cx-metric-icon">⇄</span></div><strong>{number(latest?.trading_volume)}</strong><small>Recorded market volume</small></article>
      </section>
      <section className="cx-intel-grid"><article className="cx-panel cx-price-panel"><div className="cx-panel-heading"><div><span className="cx-panel-eyebrow">PRICE PERFORMANCE</span><h2>Historical price trend</h2><p>Market price across recorded data points</p></div><span className="cx-live-tag"><i/> Market history</span></div><PriceChart data={history}/></article>
        <article className="cx-panel cx-forecast-panel"><div className="cx-panel-heading"><div><span className="cx-panel-eyebrow">MODEL OUTLOOK</span><h2>Latest forecast</h2></div><span className="cx-forecast-symbol">✳</span></div>{prediction ? <><div className="cx-forecast-price">{money(prediction.predicted_price)}</div><div className={`cx-change ${change >= 0 ? "is-up" : "is-down"}`}>{change >= 0 ? "↗" : "↘"} {Math.abs(change).toFixed(2)}% <span>expected movement</span></div><div className="cx-forecast-details"><div><span>Current price</span><strong>{money(prediction.current_price)}</strong></div><div><span>Target date</span><strong>{String(prediction.target_date || "—").slice(0, 10)}</strong></div><div><span>Model</span><strong>{prediction.model_name || "—"}</strong></div><div><span>Confidence</span><strong>{Number(prediction.confidence_score || 0).toFixed(1)}%</strong></div></div></> : <div className="cx-empty cx-empty-compact"><span>✳</span><strong>No forecast available</strong><p>Generate a forecast to view the model outlook.</p></div>}
        {canGenerate && <div className="cx-forecast-control"><label htmlFor="cx-horizon">Forecast horizon</label><div><select id="cx-horizon" value={horizon} onChange={(e) => setHorizon(e.target.value)}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option><option value="180">180 days</option><option value="365">365 days</option></select><button className="cx-button cx-button-primary" onClick={generate}>Run forecast</button></div></div>}</article></section>
      <section className="cx-panel cx-table-panel"><div className="cx-panel-heading"><div><span className="cx-panel-eyebrow">MODEL HISTORY</span><h2>Recent predictions</h2><p>Previously generated price forecasts</p></div><span className="cx-count-pill">{predictions.length} records</span></div><div className="cx-table-scroll"><table className="cx-data-table"><thead><tr><th>Target date</th><th>Current price</th><th>Predicted price</th><th>Model</th><th>Confidence</th><th>Movement</th></tr></thead><tbody>{predictions.slice(0, 12).map((p) => { const delta = Number(p.current_price) ? ((Number(p.predicted_price) - Number(p.current_price)) / Number(p.current_price)) * 100 : 0; return <tr key={p.prediction_id}><td>{String(p.target_date || "—").slice(0, 10)}</td><td>{money(p.current_price)}</td><td className="cx-strong-cell">{money(p.predicted_price)}</td><td>{p.model_name || "—"}</td><td><span className="cx-confidence">{Number(p.confidence_score || 0).toFixed(1)}%</span></td><td><span className={`cx-table-change ${delta >= 0 ? "is-up" : "is-down"}`}>{delta >= 0 ? "+" : ""}{delta.toFixed(2)}%</span></td></tr>; })}{!predictions.length && <tr><td colSpan="6"><div className="cx-table-empty">No predictions have been generated yet.</div></td></tr>}</tbody></table></div></section>
    </>}
    <footer className="cx-intel-foot"><span>CarbonX · Market intelligence</span><span>Forecasts are estimates and not guaranteed market outcomes.</span></footer>
  </main>;
}
export default MarketAnalytics;
