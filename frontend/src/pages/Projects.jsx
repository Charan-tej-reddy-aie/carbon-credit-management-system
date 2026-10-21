import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
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

const statusTone = (status = "") => {
    const value = status.toUpperCase();
    if (["CREDITS_ISSUED", "COMPLETED", "APPROVED"].includes(value)) return "positive";
    if (["REJECTED", "CANCELLED"].includes(value)) return "negative";
    if (["IN_PROGRESS", "UNDER_REVIEW"].includes(value)) return "active";
    return "pending";
};

function Projects() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const fetchProjects = async () => {
        try {
            setLoading(true);
            setError("");
            const response = await api.get("/projects/my");
            setProjects(Array.isArray(response.data?.data) ? response.data.data : []);
        } catch (err) {
            setError(err.response?.data?.message || "We couldn't load your projects. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProjects(); }, []);

    const filteredProjects = useMemo(() => projects.filter((project) => {
        const searchText = `${project.project_name || ""} ${project.project_type || ""} ${project.location || ""} ${project.project_id || ""}`.toLowerCase();
        const matchesQuery = searchText.includes(query.trim().toLowerCase());
        const matchesStatus = statusFilter === "ALL" || String(project.status || "").toUpperCase() === statusFilter;
        return matchesQuery && matchesStatus;
    }), [projects, query, statusFilter]);

    const totalReduction = projects.reduce((sum, project) => sum + (Number(project.estimated_co2_reduction) || 0), 0);
    const activeCount = projects.filter((project) => ["IN_PROGRESS", "UNDER_REVIEW"].includes(String(project.status).toUpperCase())).length;
    const completedCount = projects.filter((project) => ["COMPLETED", "CREDITS_ISSUED", "APPROVED"].includes(String(project.status).toUpperCase())).length;

    return (
        <main className="cx-workspace">
            <section className="cx-page-hero cx-project-hero">
                <div className="cx-hero-copy">
                    <div className="cx-overline"><span className="cx-overline-dot" /> COMPANY WORKSPACE</div>
                    <h1>Your carbon projects<span>.</span></h1>
                    <p>Track your climate initiatives from submission to verified carbon credits.</p>
                </div>
                <button className="cx-primary-action" onClick={() => navigate("/projects/create")}>
                    <span aria-hidden="true">＋</span> Create project
                </button>
                <div className="cx-hero-orbit cx-orbit-one" /><div className="cx-hero-orbit cx-orbit-two" />
            </section>

            <section className="cx-metric-grid" aria-label="Project portfolio summary">
                <article className="cx-metric-card"><div className="cx-metric-top"><span>Total projects</span><span className="cx-metric-icon">▦</span></div><strong>{loading ? "—" : projects.length}</strong><small>Across your company portfolio</small></article>
                <article className="cx-metric-card"><div className="cx-metric-top"><span>Estimated CO₂ reduction</span><span className="cx-metric-icon cx-icon-green">↘</span></div><strong>{loading ? "—" : formatNumber(totalReduction)} <em>tCO₂e</em></strong><small>Potential climate impact</small></article>
                <article className="cx-metric-card"><div className="cx-metric-top"><span>In progress</span><span className="cx-metric-icon cx-icon-blue">◷</span></div><strong>{loading ? "—" : activeCount}</strong><small>Projects moving through review</small></article>
                <article className="cx-metric-card"><div className="cx-metric-top"><span>Completed / credited</span><span className="cx-metric-icon cx-icon-gold">✓</span></div><strong>{loading ? "—" : completedCount}</strong><small>Projects reaching key milestones</small></article>
            </section>

            <section className="cx-content-panel">
                <div className="cx-panel-heading">
                    <div><div className="cx-overline">PORTFOLIO</div><h2>Project directory</h2><p>Search, filter, and open a project to see its full lifecycle.</p></div>
                    <button className="cx-quiet-action" onClick={fetchProjects} disabled={loading}>↻ Refresh</button>
                </div>
                <div className="cx-project-toolbar">
                    <label className="cx-search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search project, type, location…" aria-label="Search projects" /></label>
                    <div className="cx-filter-pills" aria-label="Filter by status">
                        {[ ["ALL", "All projects"], ["SUBMITTED", "Submitted"], ["IN_PROGRESS", "In progress"], ["COMPLETED", "Completed"], ["CREDITS_ISSUED", "Credited"], ["REJECTED", "Rejected"] ].map(([value, label]) => <button key={value} className={`cx-filter-pill ${statusFilter === value ? "is-selected" : ""}`} onClick={() => setStatusFilter(value)}>{label}</button>)}
                    </div>
                </div>

                {error && <div className="cx-alert cx-alert-error"><strong>Unable to load projects</strong><span>{error}</span><button onClick={fetchProjects}>Try again</button></div>}
                {loading && <div className="cx-loading-state"><span className="cx-spinner" /> Loading your portfolio…</div>}
                {!loading && !error && projects.length === 0 && <div className="cx-empty-state"><div className="cx-empty-symbol">✳</div><h3>Your first project starts here</h3><p>Create a project to begin documenting its expected carbon reduction and move it through verification.</p><button className="cx-primary-action" onClick={() => navigate("/projects/create")}>Create your first project</button></div>}
                {!loading && !error && projects.length > 0 && filteredProjects.length === 0 && <div className="cx-empty-state compact"><h3>No matching projects</h3><p>Try a different search term or status filter.</p><button className="cx-quiet-action" onClick={() => { setQuery(""); setStatusFilter("ALL"); }}>Clear filters</button></div>}

                {!loading && !error && filteredProjects.length > 0 && <div className="cx-project-grid">
                    {filteredProjects.map((project) => <article className="cx-project-card" key={project.project_id}>
                        <div className="cx-project-card-top"><span className="cx-project-type">{project.project_type || "Carbon project"}</span><span className={`cx-status-chip ${statusTone(project.status)}`}><i />{String(project.status || "SUBMITTED").replaceAll("_", " ")}</span></div>
                        <div className="cx-project-id">PROJECT / {String(project.project_id).padStart(4, "0")}</div>
                        <h3>{project.project_name || "Untitled project"}</h3>
                        <p className="cx-project-description">{project.description || "No project description has been added yet."}</p>
                        <div className="cx-project-impact"><span className="cx-impact-mark">↘</span><div><strong>{formatNumber(project.estimated_co2_reduction)} <small>tCO₂e</small></strong><span>Estimated annual reduction</span></div></div>
                        <div className="cx-project-meta"><div><span>Location</span><strong title={project.location || "Not specified"}>{project.location || "Not specified"}</strong></div><div><span>Timeline</span><strong>{formatDate(project.start_date)} – {formatDate(project.end_date)}</strong></div></div>
                        <div className="cx-project-card-footer">{project.status === "SUBMITTED" ? <button className="cx-quiet-action" onClick={() => navigate(`/projects/edit/${project.project_id}`)}>Edit details ↗</button> : <span className="cx-footer-note">Lifecycle tracking enabled</span>}<button className="cx-card-open" onClick={() => navigate(`/projects/${project.project_id}`)}>View project <span>→</span></button></div>
                    </article>)}
                </div>}
                {!loading && !error && filteredProjects.length > 0 && <div className="cx-list-footer">Showing <strong>{filteredProjects.length}</strong> of <strong>{projects.length}</strong> projects</div>}
            </section>
        </main>
    );
}

export default Projects;
