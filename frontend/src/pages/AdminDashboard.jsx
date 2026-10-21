import "../carbonx-dashboard.css";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const number = (value) => Number(value || 0).toLocaleString("en-IN");

function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [issuance, setIssuance] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [a, i, t] = await Promise.all([
        api.get("/analytics/dashboard"),
        api.get("/credits/issuance-queue"),
        api.get("/credits/tokenization-queue"),
      ]);
      setStats(a.data?.data || {});
      setIssuance(Array.isArray(i.data?.data) ? i.data.data : []);
      setTokens(Array.isArray(t.data?.data) ? t.data.data : []);
    } catch (e) {
      setError(e.response?.data?.message || "Could not load the admin dashboard.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const issue = async (item) => {
    const defaultQuantity = Math.floor(Number(item.verified_co2_reduction || item.estimated_co2_reduction || 0));
    const quantity = Number(window.prompt(`Credits to issue for ${item.project_name}:`, String(defaultQuantity)));
    if (!Number.isInteger(quantity) || quantity <= 0) return;
    const year = Number(window.prompt("Vintage year:", String(new Date().getFullYear())));
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return;
    setBusy(`issue-${item.project_id}`); setMessage(""); setError("");
    try {
      await api.post("/credits/issue", { project_id: item.project_id, verification_id: item.verification_id, quantity, vintage_year: year });
      setMessage(`Successfully issued ${number(quantity)} credits for ${item.project_name}.`);
      await load();
    } catch (e) { setError(e.response?.data?.message || "Credit issuance failed."); }
    finally { setBusy(null); }
  };

  const tokenize = async (item) => {
    const onChain = Number(window.prompt("On-chain token ID:", String(item.credit_id)));
    if (!Number.isInteger(onChain) || onChain < 0) return;
    const contract = window.prompt("Contract address:", "0x0000000000000000000000000000000000000000");
    const network = window.prompt("Blockchain network:", "Polygon Testnet");
    const tx = window.prompt("Mint transaction hash:", `0xMINT-${Date.now()}`);
    const wallet = item.wallet_address || window.prompt("Initial owner wallet:", "0x0000000000000000000000000000000000000000");
    if (!contract || !network || !tx || !wallet) return;
    setBusy(`token-${item.credit_id}`); setMessage(""); setError("");
    try {
      await api.post("/credits/tokenize", { credit_id: item.credit_id, on_chain_token_id: onChain, contract_address: contract, blockchain_network: network, mint_transaction_hash: tx, initial_owner_wallet: wallet });
      setMessage(`Credit #${item.credit_id} tokenized successfully.`);
      await load();
    } catch (e) { setError(e.response?.data?.message || "Tokenization failed."); }
    finally { setBusy(null); }
  };

  const metrics = [
    { label: "Registered users", value: number(stats.total_users), icon: "♙", tone: "green", note: "Platform accounts" },
    { label: "Carbon projects", value: number(stats.total_projects), icon: "⌂", tone: "blue", note: "Across companies" },
    { label: "Credits issued", value: number(stats.total_credits_issued), icon: "◈", tone: "mint", note: "Verified supply" },
    { label: "Tokenized assets", value: number(stats.total_tokens), icon: "⛓", tone: "violet", note: "Blockchain records" },
    { label: "Active listings", value: number(stats.active_listings), icon: "↗", tone: "amber", note: "Open marketplace offers" },
    { label: "Retired credits", value: number(stats.retired_credits), icon: "✓", tone: "slate", note: "Permanently claimed" },
  ];

  return <div className="cx-dashboard cx-admin-dashboard">
    <header className="cx-dash-header">
      <div><div className="cx-overline"><span className="cx-live-dot" /> PLATFORM OPERATIONS</div><h1>Control center<span className="cx-title-period">.</span></h1><p>Monitor the carbon-credit lifecycle, platform activity, and outstanding actions.</p></div>
      <div className="cx-header-actions"><button className="cx-button cx-button-light" onClick={() => { setLoading(true); load(); }}>↻ <span>Refresh data</span></button><button className="cx-button cx-button-dark" onClick={() => navigate("/admin/reports")}>View reports <span>↗</span></button></div>
    </header>
    {message && <div className="cx-alert cx-alert-success"><span>✓</span>{message}<button onClick={() => setMessage("")} aria-label="Dismiss">×</button></div>}
    {error && <div className="cx-alert cx-alert-error"><span>!</span>{error}<button onClick={() => setError("")} aria-label="Dismiss">×</button></div>}

    <section className="cx-admin-hero">
      <div className="cx-hero-copy"><span className="cx-hero-chip">CARBONX / ADMIN</span><h2>Every credit tells a story.<br /><em>Make it accountable.</em></h2><p>Track issuance, verify token records, and keep the carbon market transparent from end to end.</p><button className="cx-button cx-button-hero" onClick={() => navigate("/blockchain")}>Explore blockchain records <span>↗</span></button></div>
      <div className="cx-orbit-art" aria-hidden="true"><div className="cx-orbit cx-orbit-one"/><div className="cx-orbit cx-orbit-two"/><div className="cx-orbit-core"><span>CO₂</span><small>ACCOUNTABILITY</small></div><span className="cx-orbit-node node-a">✓</span><span className="cx-orbit-node node-b">↗</span><span className="cx-orbit-node node-c">◈</span></div>
      <div className="cx-hero-foot"><span><i /> Live platform overview</span><span>CarbonX · Operations dashboard</span></div>
    </section>

    <div className="cx-section-heading"><div><span className="cx-overline">AT A GLANCE</span><h2>Platform snapshot</h2></div><span className="cx-muted">Current totals from your database</span></div>
    {loading ? <div className="cx-loading-grid">{Array.from({ length: 6 }, (_, i) => <div className="cx-skeleton" key={i} />)}</div> : <section className="cx-metric-grid">{metrics.map((m) => <article className="cx-metric-card" key={m.label}><div className={`cx-metric-icon tone-${m.tone}`}>{m.icon}</div><div className="cx-metric-label">{m.label}</div><div className="cx-metric-value">{m.value}</div><div className="cx-metric-foot">{m.note}</div></article>)}</section>}

    <section className="cx-admin-lower-grid"><article className="cx-panel cx-lifecycle-panel"><div className="cx-panel-heading"><div><span className="cx-overline">THE PIPELINE</span><h2>Credit lifecycle</h2></div><span className="cx-status-pill">Operational flow</span></div><div className="cx-lifecycle-list"><div className="cx-lifecycle-step"><span className="cx-step-number">01</span><span className="cx-step-symbol">⌂</span><div><strong>Project submitted</strong><small>Company registers a project</small></div><span className="cx-step-check">✓</span></div><div className="cx-lifecycle-connector"/><div className="cx-lifecycle-step"><span className="cx-step-number">02</span><span className="cx-step-symbol">◎</span><div><strong>Independent verification</strong><small>Verifier reviews carbon impact</small></div><span className="cx-step-check">✓</span></div><div className="cx-lifecycle-connector"/><div className="cx-lifecycle-step"><span className="cx-step-number">03</span><span className="cx-step-symbol">◈</span><div><strong>Credit issuance</strong><small>Admin creates verified credits</small></div><span className={`cx-step-count ${issuance.length ? "is-pending" : ""}`}>{issuance.length} pending</span></div><div className="cx-lifecycle-connector"/><div className="cx-lifecycle-step"><span className="cx-step-number">04</span><span className="cx-step-symbol">⛓</span><div><strong>Tokenization</strong><small>Credit linked to token record</small></div><span className={`cx-step-count ${tokens.length ? "is-pending" : ""}`}>{tokens.length} pending</span></div></div></article>
      <article className="cx-panel cx-quick-panel"><div className="cx-panel-heading"><div><span className="cx-overline">SHORTCUTS</span><h2>Admin workspace</h2></div><span className="cx-shortcut-mark">↗</span></div><button className="cx-shortcut-row" onClick={() => navigate("/admin/reports")}><span className="cx-shortcut-icon">▤</span><span><strong>Reports & audit</strong><small>Review platform records</small></span><b>→</b></button><button className="cx-shortcut-row" onClick={() => navigate("/market-analytics")}><span className="cx-shortcut-icon">⌁</span><span><strong>Market analytics</strong><small>Explore market indicators</small></span><b>→</b></button><button className="cx-shortcut-row" onClick={() => navigate("/blockchain")}><span className="cx-shortcut-icon">⛓</span><span><strong>Blockchain explorer</strong><small>Inspect token activity</small></span><b>→</b></button><div className="cx-quick-note"><span>✦</span><p><strong>Keep the ledger clear.</strong><br />Review queues regularly to keep verified credits moving.</p></div></article></section>

    <section className="cx-queue-grid"><article className="cx-panel cx-queue-panel"><div className="cx-panel-heading"><div><span className="cx-overline">ACTION REQUIRED</span><h2>Awaiting credit issuance</h2></div><span className={`cx-queue-count ${issuance.length ? "has-items" : ""}`}>{issuance.length}</span></div>{loading ? <p className="cx-empty-text">Loading issuance queue…</p> : issuance.length === 0 ? <div className="cx-empty-state"><span>✓</span><strong>All caught up</strong><p>No verified projects are waiting for credit issuance.</p></div> : <div className="cx-queue-list">{issuance.map((item) => <div className="cx-queue-item" key={`${item.project_id}-${item.verification_id}`}><div className="cx-queue-avatar">{String(item.project_name || "P").slice(0, 1).toUpperCase()}</div><div className="cx-queue-info"><strong>{item.project_name}</strong><span>{item.company_name || "Company"} · Verified CO₂ {number(item.verified_co2_reduction || item.estimated_co2_reduction)}</span></div><button className="cx-button cx-button-green" disabled={busy === `issue-${item.project_id}`} onClick={() => issue(item)}>{busy === `issue-${item.project_id}` ? "Issuing…" : "Issue credits"}</button></div>)}</div>}</article>
      <article className="cx-panel cx-queue-panel"><div className="cx-panel-heading"><div><span className="cx-overline">TOKEN REGISTRY</span><h2>Awaiting tokenization</h2></div><span className={`cx-queue-count ${tokens.length ? "has-items" : ""}`}>{tokens.length}</span></div>{loading ? <p className="cx-empty-text">Loading token queue…</p> : tokens.length === 0 ? <div className="cx-empty-state"><span>⛓</span><strong>No pending tokens</strong><p>Newly issued credits will appear here when ready.</p></div> : <div className="cx-queue-list">{tokens.map((item) => <div className="cx-queue-item" key={item.credit_id}><div className="cx-queue-avatar token-avatar">◈</div><div className="cx-queue-info"><strong>Credit #{item.credit_id} · {item.project_name}</strong><span>{item.company_name || "Company"} · {number(item.quantity)} credits</span></div><button className="cx-button cx-button-green" disabled={busy === `token-${item.credit_id}`} onClick={() => tokenize(item)}>{busy === `token-${item.credit_id}` ? "Working…" : "Tokenize"}</button></div>)}</div>}</article></section>
    <footer className="cx-dash-footer"><span><i /> CarbonX platform overview</span><span>Numbers reflect data returned by the connected backend.</span></footer>
  </div>;
}
export default AdminDashboard;
