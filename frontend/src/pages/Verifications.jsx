import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import StatusBadge from "../components/StatusBadge";
import "../carbonx-workspace.css";

const formatNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—";
};
const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toLocaleDateString();
};

function Verifications() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [requestFilter, setRequestFilter] = useState("ALL");

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            setError("");
            const response = await api.get("/verifications/pending");
            setNotifications(Array.isArray(response.data?.data) ? response.data.data : []);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load the verification queue.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchNotifications(); }, []);

    const filtered = useMemo(() => notifications.filter((item) => {
        const text = `${item.project_name || ""} ${item.company_name || ""} ${item.company_owner || ""} ${item.project_type || ""} ${item.location || ""}`.toLowerCase();
        return text.includes(query.trim().toLowerCase()) && (requestFilter === "ALL" || item.notification_type === requestFilter);
    }), [notifications, query, requestFilter]);

    const startCount = notifications.filter((item) => item.notification_type === "START_APPROVAL").length;
    const completionCount = notifications.filter((item) => item.notification_type === "COMPLETION_REVIEW").length;
    const estimatedImpact = notifications.reduce((sum, item) => sum + (Number(item.estimated_co2_reduction) || 0), 0);

    return (
        <main className="cx-workspace">
            <section className="cx-page-hero cx-verifier-hero">
                <div className="cx-hero-copy">
                    <div className="cx-overline"><span className="cx-overline-dot" /> VERIFIER WORKSPACE</div>
                    <h1>Review with confidence<span>.</span></h1>
                    <p>Assess project submissions and completion evidence before carbon credits move forward.</p>
                </div>
                <div className="cx-review-hero-stamp"><span className="cx-stamp-ring">✓</span><div><strong>{loading ? "—" : notifications.length}</strong><span>items awaiting review</span></div></div>
                <div className="cx-hero-orbit cx-orbit-one" /><div className="cx-hero-orbit cx-orbit-two" />
            </section>

            <section className="cx-metric-grid cx-review-metrics" aria-label="Verification queue summary">
                <article className="cx-metric-card"><div className="cx-metric-top"><span>Pending reviews</span><span className="cx-metric-icon cx-icon-gold">◷</span></div><strong>{loading ? "—" : notifications.length}</strong><small>All requests in your queue</small></article>
                <article className="cx-metric-card"><div className="cx-metric-top"><span>Start approvals</span><span className="cx-metric-icon cx-icon-blue">↗</span></div><strong>{loading ? "—" : startCount}</strong><small>Initial project assessments</small></article>
                <article className="cx-metric-card"><div className="cx-metric-top"><span>Completion reviews</span><span className="cx-metric-icon cx-icon-green">✓</span></div><strong>{loading ? "—" : completionCount}</strong><small>Projects reporting completion</small></article>
                <article className="cx-metric-card"><div className="cx-metric-top"><span>Potential impact</span><span className="cx-metric-icon">⌁</span></div><strong>{loading ? "—" : formatNumber(estimatedImpact)} <em>tCO₂e</em></strong><small>Estimated reduction across queued projects</small></article>
            </section>

            <section className="cx-content-panel">
                <div className="cx-panel-heading"><div><div className="cx-overline">REVIEW WORKLIST</div><h2>Projects awaiting your decision</h2><p>Open a request to inspect project details and submit your decision.</p></div><button className="cx-quiet-action" onClick={fetchNotifications} disabled={loading}>↻ Refresh queue</button></div>
                <div className="cx-project-toolbar cx-review-toolbar">
                    <label className="cx-search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search project, company, location…" aria-label="Search verification queue" /></label>
                    <div className="cx-filter-pills"><button className={`cx-filter-pill ${requestFilter === "ALL" ? "is-selected" : ""}`} onClick={() => setRequestFilter("ALL")}>All requests</button><button className={`cx-filter-pill ${requestFilter === "START_APPROVAL" ? "is-selected" : ""}`} onClick={() => setRequestFilter("START_APPROVAL")}>Start approval</button><button className={`cx-filter-pill ${requestFilter === "COMPLETION_REVIEW" ? "is-selected" : ""}`} onClick={() => setRequestFilter("COMPLETION_REVIEW")}>Completion review</button></div>
                </div>

                {error && <div className="cx-alert cx-alert-error"><strong>Queue unavailable</strong><span>{error}</span><button onClick={fetchNotifications}>Try again</button></div>}
                {loading && <div className="cx-loading-state"><span className="cx-spinner" /> Loading verification requests…</div>}
                {!loading && !error && notifications.length === 0 && <div className="cx-empty-state"><div className="cx-empty-symbol cx-empty-check">✓</div><h3>You're all caught up</h3><p>There are no pending verification requests right now. New submissions will appear here.</p></div>}
                {!loading && !error && notifications.length > 0 && filtered.length === 0 && <div className="cx-empty-state compact"><h3>No matching requests</h3><p>Adjust the search or choose another request type.</p><button className="cx-quiet-action" onClick={() => { setQuery(""); setRequestFilter("ALL"); }}>Clear filters</button></div>}

                {!loading && !error && filtered.length > 0 && <div className="cx-review-list">{filtered.map((item) => {
                    const isStart = item.notification_type === "START_APPROVAL";
                    return <article className="cx-review-card" key={item.notification_id}>
                        <div className={`cx-review-kind ${isStart ? "kind-start" : "kind-complete"}`}><span>{isStart ? "↗" : "✓"}</span><small>{isStart ? "START APPROVAL" : "COMPLETION REVIEW"}</small></div>
                        <div className="cx-review-main"><div className="cx-review-title-line"><div><div className="cx-project-id">REQUEST / {String(item.notification_id).padStart(4, "0")}</div><h3>{item.project_name || "Untitled project"}</h3></div><StatusBadge status={item.notification_type} /></div>
                            <div className="cx-review-company"><span className="cx-company-avatar">{String(item.company_name || "C").trim().charAt(0).toUpperCase()}</span><div><strong>{item.company_name || "Unknown company"}</strong><span>{item.company_owner || "Owner not provided"}</span></div></div>
                            <div className="cx-review-details"><div><span>Project type</span><strong>{item.project_type || "—"}</strong></div><div><span>Location</span><strong>{item.location || "—"}</strong></div><div><span>Estimated reduction</span><strong>{formatNumber(item.estimated_co2_reduction)} tCO₂e</strong></div><div><span>Project timeline</span><strong>{formatDate(item.start_date)} – {formatDate(item.end_date)}</strong></div></div>
                        </div>
                        <div className="cx-review-action"><button className="cx-primary-action" onClick={() => navigate(`/verifications/${item.project_id}?notification=${item.notification_id}`)}>Review request <span>→</span></button><small>{isStart ? "Initial assessment" : "Validate completion"}</small></div>
                    </article>;
                })}</div>}
                {!loading && !error && filtered.length > 0 && <div className="cx-list-footer">Showing <strong>{filtered.length}</strong> of <strong>{notifications.length}</strong> review requests</div>}
            </section>
        </main>
    );
}

export default Verifications;
