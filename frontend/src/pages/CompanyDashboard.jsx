import "../carbonx-dashboard.css";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const fmt = (v) => Number(v || 0).toLocaleString("en-IN");
const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function CompanyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [s, t, l] = await Promise.all([
        api.get("/marketplace/credit-summary"),
        api.get("/marketplace/my-transactions"),
        api.get("/marketplace/my-listings"),
      ]);
      setSummary(s.data?.data || null);
      setTransactions(Array.isArray(t.data?.data) ? t.data.data : []);
      setListings(Array.isArray(l.data?.data) ? l.data.data : []);
    } catch (e) { setError(e.response?.data?.message || "Could not load your company dashboard."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const registered = Number(summary?.registered_credits || 0);
  const reported = Number(summary?.reported_credits || 0);
  const difference = Number(summary?.credit_difference || 0);
  const sellable = Number(summary?.sellable_credits || 0);
  const needToBuy = Number(summary?.credits_to_purchase || 0);
  const totalPurchased = transactions.filter(t => Number(t.buyer_id) === Number(user?.user_id)).reduce((sum, t) => sum + Number(t.quantity || 0), 0);
  const totalSold = transactions.filter(t => Number(t.seller_id) === Number(user?.user_id)).reduce((sum, t) => sum + Number(t.quantity || 0), 0);
  const activeListings = listings.filter(l => ["ACTIVE", "PARTIALLY_SOLD"].includes(l.status)).length;
  const companyName = summary?.company_name || user?.company_name || "Your company";

  return <div className="cx-dashboard cx-company-dashboard">
    <header className="cx-dash-header"><div><div className="cx-overline"><span className="cx-live-dot" /> COMPANY WORKSPACE</div><h1>Good to see you again<span className="cx-title-period">.</span></h1><p>Here's the latest on <strong>{companyName}</strong> and your carbon-credit portfolio.</p></div><div className="cx-header-actions"><button className="cx-button cx-button-light" onClick={load}>↻ <span>Refresh</span></button><button className="cx-button cx-button-dark" onClick={() => navigate("/projects/create")}>＋ Create project</button></div></header>
    {error && <div className="cx-alert cx-alert-error"><span>!</span>{error}<button onClick={() => setError("")} aria-label="Dismiss">×</button></div>}

    <section className="cx-company-hero"><div className="cx-company-hero-copy"><span className="cx-hero-chip">YOUR SUSTAINABILITY SNAPSHOT</span><h2>Turn your climate<br />commitment into <em>impact.</em></h2><p>Manage projects, track carbon credits, and take part in a more transparent carbon market.</p><div className="cx-company-hero-actions"><button className="cx-button cx-button-hero" onClick={() => navigate("/projects")}>Explore my projects <span>→</span></button><button className="cx-hero-link" onClick={() => navigate("/marketplace")}>Browse marketplace ↗</button></div></div><div className="cx-impact-visual" aria-hidden="true"><div className="cx-impact-ring ring-outer"/><div className="cx-impact-ring ring-inner"/><div className="cx-impact-leaf">✳</div><div className="cx-impact-number"><strong>{loading ? "—" : fmt(registered)}</strong><span>registered credits</span></div><div className="cx-impact-tag tag-top">CO₂ ↓</div><div className="cx-impact-tag tag-bottom">CLIMATE ACTION</div></div><div className="cx-hero-foot"><span><i /> Portfolio overview</span><span>Small steps. Measurable impact.</span></div></section>

    <div className="cx-section-heading"><div><span className="cx-overline">YOUR PORTFOLIO</span><h2>Carbon credit overview</h2></div><span className="cx-muted">Live account summary</span></div>
    <section className="cx-metric-grid cx-company-metrics"><article className="cx-metric-card"><div className="cx-metric-icon tone-green">◈</div><div className="cx-metric-label">Registered credits</div><div className="cx-metric-value">{loading ? "—" : fmt(registered)}</div><div className="cx-metric-foot">Credits in your registry</div></article><article className="cx-metric-card"><div className="cx-metric-icon tone-blue">↗</div><div className="cx-metric-label">Reported credits</div><div className="cx-metric-value">{loading ? "—" : fmt(reported)}</div><div className="cx-metric-foot">Credits reported by your company</div></article><article className="cx-metric-card"><div className={`cx-metric-icon ${difference < 0 ? "tone-amber" : "tone-mint"}`}>{difference < 0 ? "!" : "✓"}</div><div className="cx-metric-label">Credit balance</div><div className="cx-metric-value">{loading ? "—" : `${difference > 0 ? "+" : ""}${fmt(difference)}`}</div><div className="cx-metric-foot">{difference < 0 ? "Credits needed to balance" : "Your reported balance"}</div></article><article className="cx-metric-card"><div className="cx-metric-icon tone-violet">⇧</div><div className="cx-metric-label">Available to sell</div><div className="cx-metric-value">{loading ? "—" : fmt(sellable)}</div><div className="cx-metric-foot">Eligible credits for listing</div></article></section>

    {!loading && difference < 0 && <section className="cx-company-alert"><div className="cx-company-alert-icon">!</div><div><span className="cx-overline">ATTENTION NEEDED</span><h3>Your credit balance needs attention</h3><p>Your company needs <strong>{fmt(needToBuy)} additional credits</strong> to balance reported and registered credits.</p></div><button className="cx-button cx-button-dark" onClick={() => navigate("/marketplace")}>Find credits <span>→</span></button></section>}

    <section className="cx-company-main-grid"><article className="cx-panel"><div className="cx-panel-heading"><div><span className="cx-overline">GET THINGS DONE</span><h2>Your workspace</h2></div><span className="cx-shortcut-mark">✦</span></div><div className="cx-action-grid"><button className="cx-action-tile" onClick={() => navigate("/projects/create")}><span className="cx-action-tile-icon green-tile">＋</span><strong>Create a project</strong><small>Register a new climate initiative</small><b>Start here ↗</b></button><button className="cx-action-tile" onClick={() => navigate("/marketplace")}><span className="cx-action-tile-icon blue-tile">◇</span><strong>Carbon marketplace</strong><small>Buy verified credits from sellers</small><b>Explore market ↗</b></button><button className="cx-action-tile" onClick={() => navigate("/marketplace/sell")}><span className="cx-action-tile-icon amber-tile">↑</span><strong>Sell your credits</strong><small>{sellable ? `${fmt(sellable)} credits currently available` : "List eligible credits for sale"}</small><b>Manage listings ↗</b></button><button className="cx-action-tile" onClick={() => navigate("/transactions")}><span className="cx-action-tile-icon violet-tile">⇄</span><strong>Transactions</strong><small>Review purchases and sales</small><b>View history ↗</b></button></div></article>
      <article className="cx-panel cx-portfolio-panel"><div className="cx-panel-heading"><div><span className="cx-overline">MARKET ACTIVITY</span><h2>Trading summary</h2></div><button className="cx-inline-link" onClick={() => navigate("/transactions")}>Details →</button></div><div className="cx-trading-stat"><span className="cx-trading-icon purchased">↓</span><div><small>Credits purchased</small><strong>{loading ? "—" : fmt(totalPurchased)}</strong></div><span className="cx-trading-caption">In</span></div><div className="cx-trading-stat"><span className="cx-trading-icon sold">↑</span><div><small>Credits sold</small><strong>{loading ? "—" : fmt(totalSold)}</strong></div><span className="cx-trading-caption">Out</span></div><div className="cx-trading-stat"><span className="cx-trading-icon listed">≋</span><div><small>Active listings</small><strong>{loading ? "—" : fmt(activeListings)}</strong></div><span className="cx-trading-caption">Open</span></div><div className="cx-trading-bottom"><span>All transactions</span><strong>{fmt(transactions.length)}</strong></div></article></section>

    <section className="cx-panel cx-transactions-panel"><div className="cx-panel-heading"><div><span className="cx-overline">RECENT ACTIVITY</span><h2>Latest transactions</h2><p>Track the movement of carbon credits across your account.</p></div><button className="cx-button cx-button-light" onClick={() => navigate("/transactions")}>View all <span>→</span></button></div>{loading ? <div className="cx-table-loading">Loading transaction history…</div> : transactions.length === 0 ? <div className="cx-empty-state"><span>⇄</span><strong>Your activity starts here</strong><p>Completed purchases and sales will show up in this table.</p><button className="cx-button cx-button-green" onClick={() => navigate("/marketplace")}>Explore marketplace</button></div> : <div className="cx-table-scroll"><table className="cx-table"><thead><tr><th>Project</th><th>Activity</th><th>Counterparty</th><th>Quantity</th><th>Price / credit</th><th>Total</th><th>Status</th></tr></thead><tbody>{transactions.slice(0, 6).map((t, index) => { const isBuyer = Number(t.buyer_id) === Number(user?.user_id); return <tr key={t.transaction_id ?? `${t.project_name}-${index}`}><td><div className="cx-project-cell"><span className="cx-project-dot">◈</span><strong>{t.project_name || "Carbon credit transaction"}</strong></div></td><td><span className={`cx-activity-pill ${isBuyer ? "activity-buy" : "activity-sell"}`}>{isBuyer ? "↓ Purchased" : "↑ Sold"}</span></td><td>{isBuyer ? t.seller_company : t.buyer_company || "—"}</td><td>{fmt(t.quantity)}</td><td>{money(t.price_per_credit)}</td><td><strong>{money(t.total_amount)}</strong></td><td><span className={`cx-status-label ${String(t.transaction_status || "").toLowerCase()}`}>{t.transaction_status || "Recorded"}</span></td></tr>; })}</tbody></table></div>}</section>
    <footer className="cx-dash-footer"><span><i /> Your CarbonX workspace</span><span>Portfolio figures are based on your connected account.</span></footer>
  </div>;
}
export default CompanyDashboard;
