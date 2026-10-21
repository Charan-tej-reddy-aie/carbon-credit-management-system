import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "../carbonx-admin-reports.css";

const number = (value) => Number(value || 0).toLocaleString();
const currency = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const safeArray = (value) => Array.isArray(value) ? value : [];

function AdminReports() {
    const [data, setData] = useState({ summary: {}, projectStatus: [], projectTypes: [], companyPerformance: [], recentActivity: [] });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState("");
    const [activityFilter, setActivityFilter] = useState("all");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await api.get("/reports/admin");
            const result = response?.data?.data || {};
            setData({
                summary: result.summary || {},
                projectStatus: safeArray(result.projectStatus),
                projectTypes: safeArray(result.projectTypes),
                companyPerformance: safeArray(result.companyPerformance),
                recentActivity: safeArray(result.recentActivity),
            });
        } catch (e) {
            setError(e.response?.data?.message || "We couldn't load the latest reports. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const download = async (type) => {
        setExporting(type);
        setError("");
        try {
            const response = await api.get(`/reports/export/${type}`, { responseType: "blob" });
            const url = URL.createObjectURL(response.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = `carbonx-${type}-report.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            setError(e.response?.data?.message || `Failed to export the ${type} report.`);
        } finally {
            setExporting("");
        }
    };

    const s = data.summary;
    const cards = [
        { label: "Registered users", value: number(s.total_users), detail: `${number(s.total_companies)} companies`, icon: "users", tone: "mint" },
        { label: "Carbon projects", value: number(s.total_projects), detail: `${number(s.approved_projects)} approved`, icon: "layers", tone: "blue" },
        { label: "Credits issued", value: number(s.credits_issued), detail: `${number(s.token_count)} token records`, icon: "leaf", tone: "green" },
        { label: "Credits retired", value: number(s.credits_retired), detail: "Recorded retirement volume", icon: "shield", tone: "amber" },
        { label: "Credits traded", value: number(s.credits_traded), detail: `${number(s.successful_transactions)} successful trades`, icon: "arrow", tone: "violet" },
        { label: "Marketplace value", value: currency(s.transaction_value), detail: `${number(s.active_listings)} active listings`, icon: "wallet", tone: "dark" },
    ];

    const projectTotal = data.projectStatus.reduce((total, row) => total + Number(row.count || 0), 0);
    const maxStatus = Math.max(1, ...data.projectStatus.map((row) => Number(row.count || 0)));
    const filteredActivity = useMemo(() => {
        if (activityFilter === "all") return data.recentActivity;
        return data.recentActivity.filter((row) => String(row.activity_type || "").toLowerCase().includes(activityFilter));
    }, [activityFilter, data.recentActivity]);

    const exports = [
        { type: "projects", title: "Project register", desc: "Project status and ownership", icon: "▤" },
        { type: "credits", title: "Carbon credits", desc: "Issuance and credit records", icon: "◈" },
        { type: "transactions", title: "Transactions", desc: "Marketplace trade history", icon: "↔" },
        { type: "blockchain", title: "Blockchain records", desc: "Token and transfer records", icon: "⌘" },
        { type: "retirements", title: "Retirement register", desc: "Retired credits and beneficiaries", icon: "✓" },
    ];

    return <main className="dashboard-page cx-report-page">
        <header className="cx-report-hero">
            <div className="cx-report-hero-copy">
                <span className="cx-report-eyebrow"><span /> CARBONX / ADMIN INTELLIGENCE</span>
                <h1>Reports &amp; audit</h1>
                <p>A clear view of platform activity, carbon-credit movement, company performance, and exportable records.</p>
            </div>
            <button className="cx-report-refresh" onClick={load} disabled={loading}>
                <span className={loading ? "cx-report-spin" : ""}>↻</span> {loading ? "Refreshing…" : "Refresh data"}
            </button>
            <div className="cx-report-hero-orb cx-report-orb-one" />
            <div className="cx-report-hero-orb cx-report-orb-two" />
        </header>

        {error && <div className="cx-report-alert" role="alert"><span>!</span><div>{error}</div><button onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}

        {loading ? <section className="cx-report-loading" aria-live="polite"><span className="cx-report-loader" /><div><strong>Preparing your reports</strong><p>Loading the latest platform records…</p></div></section> : <>
            <section className="cx-report-metric-grid" aria-label="Platform summary">
                {cards.map((card) => <article className={`cx-report-metric cx-tone-${card.tone}`} key={card.label}>
                    <div className="cx-report-metric-top"><span>{card.label}</span><span className="cx-report-metric-icon">{card.icon === "users" ? "♙" : card.icon === "layers" ? "▧" : card.icon === "leaf" ? "♧" : card.icon === "shield" ? "◇" : card.icon === "arrow" ? "↗" : "₹"}</span></div>
                    <strong className="cx-report-metric-value">{card.value}</strong>
                    <span className="cx-report-metric-detail">{card.detail}</span>
                </article>)}
            </section>

            <section className="cx-report-main-grid">
                <article className="cx-report-panel cx-report-status-panel">
                    <div className="cx-report-panel-heading"><div><span className="cx-report-section-kicker">PROJECT PIPELINE</span><h2>Project status</h2><p>Distribution of projects across recorded statuses.</p></div><span className="cx-report-total-pill">{number(projectTotal)} total</span></div>
                    {data.projectStatus.length ? <div className="cx-report-status-list">{data.projectStatus.map((row) => {
                        const count = Number(row.count || 0);
                        const pct = projectTotal ? Math.round(count / projectTotal * 100) : 0;
                        return <div className="cx-report-status-row" key={row.status}><div className="cx-report-status-meta"><span className="cx-report-status-dot" /><strong>{String(row.status || "Unknown").replaceAll("_", " ")}</strong><span>{number(count)} <em>({pct}%)</em></span></div><div className="cx-report-progress"><span style={{ width: `${Math.min(100, count / maxStatus * 100)}%` }} /></div></div>;
                    })}</div> : <div className="cx-report-empty"><span>▤</span><strong>No project status data yet</strong><p>Status breakdown will appear when projects are recorded.</p></div>}
                </article>

                <article className="cx-report-panel cx-report-export-panel">
                    <div className="cx-report-panel-heading"><div><span className="cx-report-section-kicker">DATA MANAGEMENT</span><h2>Export center</h2><p>Download a CSV for offline analysis or audit.</p></div><span className="cx-report-export-mark">↓</span></div>
                    <div className="cx-report-export-list">{exports.map((item) => <div className="cx-report-export-item" key={item.type}><span className="cx-report-export-icon">{item.icon}</span><div className="cx-report-export-copy"><strong>{item.title}</strong><span>{item.desc}</span></div><button onClick={() => download(item.type)} disabled={!!exporting} aria-label={`Export ${item.type} report`}>{exporting === item.type ? "…" : "↓"}</button></div>)}</div>
                    <p className="cx-report-export-note">Exports use the current authenticated admin session.</p>
                </article>
            </section>

            <section className="cx-report-panel cx-report-company-panel">
                <div className="cx-report-panel-heading"><div><span className="cx-report-section-kicker">PARTICIPANT PERFORMANCE</span><h2>Company activity</h2><p>Compare project activity and credit movement across companies.</p></div><span className="cx-report-table-count">{number(data.companyPerformance.length)} companies</span></div>
                {data.companyPerformance.length ? <div className="cx-report-table-wrap"><table className="data-table cx-report-table"><thead><tr><th>Company</th><th>Projects</th><th>Credits issued</th><th>Credits traded</th><th>Credits retired</th></tr></thead><tbody>{data.companyPerformance.map((row, i) => <tr key={`${row.company_name || "company"}-${i}`}><td><span className="cx-report-company-avatar">{String(row.company_name || "C").trim().charAt(0).toUpperCase()}</span><strong>{row.company_name || "Unnamed company"}</strong></td><td>{number(row.projects)}</td><td>{number(row.credits_issued)}</td><td>{number(row.credits_traded)}</td><td>{number(row.credits_retired)}</td></tr>)}</tbody></table></div> : <div className="cx-report-empty"><span>♙</span><strong>No company performance records</strong><p>Company summaries will appear here when data is available.</p></div>}
            </section>

            <section className="cx-report-panel cx-report-activity-panel">
                <div className="cx-report-panel-heading cx-report-activity-heading"><div><span className="cx-report-section-kicker">AUDIT TRAIL</span><h2>Recent platform activity</h2><p>A chronological view of recent recorded events.</p></div><label className="cx-report-filter">Filter <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)}><option value="all">All activity</option><option value="project">Projects</option><option value="credit">Credits</option><option value="transaction">Transactions</option><option value="retirement">Retirements</option><option value="token">Tokens</option></select></label></div>
                {filteredActivity.length ? <div className="cx-report-table-wrap"><table className="data-table cx-report-table"><thead><tr><th>Recorded at</th><th>Activity</th><th>Reference</th><th>Description</th></tr></thead><tbody>{filteredActivity.map((row, i) => <tr key={`${row.activity_type}-${row.reference_id}-${i}`}><td className="cx-report-date">{row.activity_time ? new Date(row.activity_time).toLocaleString() : "—"}</td><td><span className="cx-report-activity-type">{row.activity_type || "Activity"}</span></td><td><code>#{row.reference_id ?? "—"}</code></td><td>{row.description || "No description provided"}</td></tr>)}</tbody></table></div> : <div className="cx-report-empty"><span>◷</span><strong>No matching activity</strong><p>Try a different filter or check back when more events are recorded.</p></div>}
            </section>
            <footer className="cx-report-footer"><span>CARBONX ADMIN REPORTS</span><span>Data shown reflects records returned by the current platform APIs.</span></footer>
        </>}
    </main>;
}

export default AdminReports;
