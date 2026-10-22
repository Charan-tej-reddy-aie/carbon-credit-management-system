import "../carbonx-dashboard.css";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const fmt = (v) => Number(v || 0).toLocaleString("en-IN");
const formatDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v).slice(0, 10) : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

function VerifierDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [recentVerifications, setRecentVerifications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sumRes, queueRes, verifRes, projRes] = await Promise.allSettled([
        api.get("/verifications/summary"),
        api.get("/verifications/pending"),
        api.get("/verifications"),
        api.get("/projects")
      ]);

      const sumData = sumRes.status === "fulfilled" ? sumRes.value.data?.data : null;
      const queueData = queueRes.status === "fulfilled" && Array.isArray(queueRes.value.data?.data) ? queueRes.value.data.data : [];
      const verifData = verifRes.status === "fulfilled" && Array.isArray(verifRes.value.data?.data) ? verifRes.value.data.data : [];
      const projData = projRes.status === "fulfilled" && Array.isArray(projRes.value.data?.data) ? projRes.value.data.data : [];

      setSummary(sumData);
      setPendingQueue(queueData);
      setRecentVerifications(sumData?.recent_verifications?.length ? sumData.recent_verifications : verifData.slice(0, 5));
      setProjects(projData);
    } catch (e) {
      setError(e.response?.data?.message || "Could not load verification statistics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Derived counts with bulletproof fallback matching database lifecycle
  const pendingProjects = projects.filter((p) => String(p.status).toUpperCase() === "SUBMITTED");
  const approvedProjects = projects.filter((p) =>
    ["APPROVED", "IN_PROGRESS", "COMPLETION_PENDING", "COMPLETED", "CREDITS_ISSUED"].includes(String(p.status).toUpperCase())
  );
  const inReviewProjects = projects.filter((p) =>
    ["UNDER_REVIEW", "IN_REVIEW", "COMPLETION_PENDING", "VERIFICATION_IN_PROGRESS"].includes(String(p.status).toUpperCase())
  );
  const rejectedProjects = projects.filter((p) => String(p.status).toUpperCase() === "REJECTED");

  const awaitingReviewCount = summary?.awaiting_review ?? (pendingQueue.length || pendingProjects.length);
  const approvedCount = summary?.approved_projects ?? approvedProjects.length;
  const inReviewCount = summary?.in_review ?? (inReviewProjects.length || pendingQueue.filter((q) => q.notification_type === "COMPLETION_REVIEW").length);
  const rejectedCount = summary?.rejected ?? rejectedProjects.length;

  // Queue priority work: prefer pending notifications with actionable links, fallback to submitted projects
  const priorityItems = pendingQueue.length > 0
    ? pendingQueue.slice(0, 5)
    : [...pendingProjects, ...inReviewProjects].slice(0, 5);

  const name = user?.full_name?.trim()?.split(/\s+/)[0] || "Verifier";

  return (
    <div className="cx-dashboard cx-verifier-dashboard">
      <header className="cx-dash-header">
        <div>
          <div className="cx-overline"><span className="cx-live-dot" /> VERIFICATION WORKSPACE</div>
          <h1>Review with confidence<span className="cx-title-period">.</span></h1>
          <p>Good day, <strong>{name}</strong>. Your decisions help protect the integrity of the carbon market.</p>
        </div>
        <div className="cx-header-actions">
          <button className="cx-button cx-button-light" onClick={load}>↻ <span>Refresh</span></button>
          <button className="cx-button cx-button-dark" onClick={() => navigate("/verifications")}>Open review queue <span>→</span></button>
        </div>
      </header>

      {error && (
        <div className="cx-alert cx-alert-error">
          <span>!</span>{error}
          <button onClick={() => setError("")} aria-label="Dismiss">×</button>
        </div>
      )}

      <section className="cx-verifier-hero">
        <div className="cx-verifier-hero-copy">
          <span className="cx-hero-chip">TRUST THROUGH VERIFICATION</span>
          <h2>Good data.<br /><em>Better decisions.</em></h2>
          <p>Review submitted projects, validate reported impact, and help ensure every issued credit is backed by credible evidence.</p>
          <button className="cx-button cx-button-hero" onClick={() => navigate("/verifications")}>Start reviewing <span>→</span></button>
        </div>
        <div className="cx-review-illustration" aria-hidden="true">
          <div className="cx-review-circle circle-one" />
          <div className="cx-review-circle circle-two" />
          <div className="cx-review-document">
            <div className="cx-document-top"><span>CO₂</span><span>PROJECT REVIEW</span></div>
            <div className="cx-document-line line-wide" />
            <div className="cx-document-line" />
            <div className="cx-document-line line-short" />
            <div className="cx-document-stamp">✓<small>VERIFIED</small></div>
          </div>
          <span className="cx-review-spark spark-one">✦</span>
          <span className="cx-review-spark spark-two">✳</span>
        </div>
        <div className="cx-hero-foot">
          <span><i /> Verification desk</span>
          <span>Accuracy builds trust.</span>
        </div>
      </section>

      <div className="cx-section-heading">
        <div>
          <span className="cx-overline">YOUR REVIEW DESK</span>
          <h2>Verification overview</h2>
        </div>
        <span className="cx-muted">{user?.role || "VERIFIER"} account</span>
      </div>

      <section className="cx-metric-grid cx-verifier-metrics">
        <article className="cx-metric-card">
          <div className="cx-metric-icon tone-amber">◷</div>
          <div className="cx-metric-label">Awaiting review</div>
          <div className="cx-metric-value">{loading ? "—" : fmt(awaitingReviewCount)}</div>
          <div className="cx-metric-foot">Submitted projects</div>
        </article>
        <article className="cx-metric-card">
          <div className="cx-metric-icon tone-green">✓</div>
          <div className="cx-metric-label">Approved projects</div>
          <div className="cx-metric-value">{loading ? "—" : fmt(approvedCount)}</div>
          <div className="cx-metric-foot">Passed verification</div>
        </article>
        <article className="cx-metric-card">
          <div className="cx-metric-icon tone-violet">↻</div>
          <div className="cx-metric-label">In review</div>
          <div className="cx-metric-value">{loading ? "—" : fmt(inReviewCount)}</div>
          <div className="cx-metric-foot">Currently being assessed</div>
        </article>
        <article className="cx-metric-card">
          <div className="cx-metric-icon tone-slate">×</div>
          <div className="cx-metric-label">Rejected</div>
          <div className="cx-metric-value">{loading ? "—" : fmt(rejectedCount)}</div>
          <div className="cx-metric-foot">Did not meet requirements</div>
        </article>
      </section>

      <section className="cx-verifier-main-grid">
        <article className="cx-panel cx-review-queue-panel">
          <div className="cx-panel-heading">
            <div>
              <span className="cx-overline">PRIORITY WORK</span>
              <h2>Projects needing attention</h2>
              <p>Open a project to review its submitted information and record a decision.</p>
            </div>
            <span className={`cx-queue-count ${priorityItems.length ? "has-items" : ""}`}>
              {priorityItems.length}
            </span>
          </div>

          {loading ? (
            <div className="cx-table-loading">Loading project queue…</div>
          ) : priorityItems.length === 0 ? (
            <div className="cx-empty-state">
              <span>✓</span>
              <strong>No projects waiting for review</strong>
              <p>When companies submit projects, they will appear here.</p>
            </div>
          ) : (
            <div className="cx-review-list">
              {priorityItems.map((p, i) => {
                const isNotification = Boolean(p.notification_id);
                const projectId = p.project_id;
                const notificationId = p.notification_id;
                const targetUrl = isNotification
                  ? `/verifications/${projectId}?notification=${notificationId}`
                  : `/verifications`;

                const statusLabel = p.notification_type
                  ? p.notification_type.replaceAll("_", " ")
                  : String(p.status || "SUBMITTED").replaceAll("_", " ");

                return (
                  <div className="cx-review-item" key={notificationId ?? projectId ?? `${p.project_name}-${i}`}>
                    <div className="cx-queue-avatar">
                      {String(p.project_name || "P").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="cx-queue-info">
                      <strong>{p.project_name || `Project #${projectId}`}</strong>
                      <span>{p.company_name || p.company_owner || "Company submission"}</span>
                    </div>
                    <span className={`cx-status-label ${String(p.status || p.notification_type || "submitted").toLowerCase()}`}>
                      {statusLabel}
                    </span>
                    <button
                      className="cx-icon-button"
                      title="Open verification review"
                      onClick={() => navigate(targetUrl)}
                    >
                      →
                    </button>
                  </div>
                );
              })}
              <button className="cx-queue-footer-link" onClick={() => navigate("/verifications")}>
                View full verification queue <span>→</span>
              </button>
            </div>
          )}
        </article>

        <aside className="cx-verifier-side">
          <article className="cx-panel cx-integrity-card">
            <div className="cx-integrity-emblem">✓</div>
            <span className="cx-overline">YOUR MISSION</span>
            <h2>Protect the integrity of every credit.</h2>
            <p>Consistent, evidence-based reviews help prevent over-crediting and strengthen trust in the marketplace.</p>
            <div className="cx-integrity-rule" />
            <div className="cx-integrity-meta">
              <span>Review standard</span>
              <strong>Evidence first</strong>
            </div>
          </article>

          <article className="cx-panel cx-shortcuts-panel">
            <div className="cx-panel-heading">
              <div>
                <span className="cx-overline">TOOLS</span>
                <h2>Quick access</h2>
              </div>
            </div>
            <button className="cx-shortcut-row" onClick={() => navigate("/verifications")}>
              <span className="cx-shortcut-icon">☷</span>
              <span><strong>Verification queue</strong><small>Review submitted projects</small></span>
              <b>→</b>
            </button>
            <button className="cx-shortcut-row" onClick={() => navigate("/verifier/pricing")}>
              <span className="cx-shortcut-icon">₹</span>
              <span><strong>Credit pricing</strong><small>Review proposed pricing</small></span>
              <b>→</b>
            </button>
            <button className="cx-shortcut-row" onClick={() => navigate("/market-analytics")}>
              <span className="cx-shortcut-icon">⌁</span>
              <span><strong>Market analytics</strong><small>View market indicators</small></span>
              <b>→</b>
            </button>
          </article>
        </aside>
      </section>

      {/* Recent Verifications Audit Table */}
      <section className="cx-panel cx-transactions-panel">
        <div className="cx-panel-heading">
          <div>
            <span className="cx-overline">AUDIT TRAIL</span>
            <h2>Recent verification activity</h2>
            <p>Decisions and reviews previously recorded by verified authorities.</p>
          </div>
          <button className="cx-button cx-button-light" onClick={() => navigate("/verifications")}>
            Review queue <span>→</span>
          </button>
        </div>

        {loading ? (
          <div className="cx-table-loading">Loading verification history…</div>
        ) : recentVerifications.length === 0 ? (
          <div className="cx-empty-state">
            <span>✓</span>
            <strong>No prior verification records</strong>
            <p>Recorded verification decisions will appear here.</p>
          </div>
        ) : (
          <div className="cx-table-scroll">
            <table className="cx-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Company</th>
                  <th>Stage</th>
                  <th>Verified CO₂</th>
                  <th>Decision</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentVerifications.map((v, idx) => (
                  <tr key={v.verification_id ?? idx}>
                    <td>
                      <div className="cx-project-cell">
                        <span className="cx-project-dot">✓</span>
                        <strong>{v.project_name || `Project #${v.project_id}`}</strong>
                      </div>
                    </td>
                    <td>{v.company_name || "—"}</td>
                    <td>
                      <span className="cx-activity-pill">
                        {String(v.verification_stage || "START_APPROVAL").replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      {v.verified_co2_reduction ? `${fmt(v.verified_co2_reduction)} tCO₂e` : v.credits_used ? `${fmt(v.credits_used)} credits` : "—"}
                    </td>
                    <td>
                      <span className={`cx-status-label ${String(v.status || "approved").toLowerCase()}`}>
                        {v.status || "APPROVED"}
                      </span>
                    </td>
                    <td>{formatDate(v.verified_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="cx-dash-footer">
        <span><i /> Independent verification matters</span>
        <span>Project counts reflect live data returned by the MySQL database.</span>
      </footer>
    </div>
  );
}

export default VerifierDashboard;

