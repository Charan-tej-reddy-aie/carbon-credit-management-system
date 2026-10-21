import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";

function SellerDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deleting, setDeleting] = useState(null);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await api.get("/projects/my");

                setProjects(response.data.data || []);
            } catch (error) {
                setError(
                    error.response?.data?.message ||
                    "Failed to load projects"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const submittedCount = projects.filter(
        (project) => project.status === "SUBMITTED"
    ).length;

    const approvedCount = projects.filter(
        (project) => project.status === "APPROVED"
    ).length;

    const rejectedCount = projects.filter(
        (project) => project.status === "REJECTED"
    ).length;

    const handleDelete = async (projectId) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this project?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setDeleting(projectId);
            setError("");

            await api.delete(
                `/projects/${projectId}`
            );

            setProjects((previous) =>
                previous.filter(
                    (project) =>
                        project.project_id !== projectId
                )
            );
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Failed to delete project"
            );
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="seller-dashboard">

            {/* Page Header */}
            <div className="seller-header">

                <div>

                    <p className="eyebrow">
                        SELLER PORTAL
                    </p>

                    <h1>
                        Seller Dashboard
                    </h1>

                    <p className="seller-welcome">
                        Welcome back, {user?.full_name}
                    </p>

                </div>

                <button
                    className="primary-button"
                    onClick={() =>
                        navigate("/projects/create")
                    }
                >
                    + Create Project
                </button>

            </div>

            {/* Company information */}
            <div className="seller-company-card">

                <div>

                    <span>
                        Company
                    </span>

                    <strong>
                        {user?.company_name || "—"}
                    </strong>

                </div>

                <div>

                    <span>
                        Account Role
                    </span>

                    <strong>
                        {user?.role || "SELLER"}
                    </strong>

                </div>

            </div>

            {/* Statistics */}
            <div className="stats-grid">

                <div className="stat-card">

                    <div className="stat-icon">
                        P
                    </div>

                    <div>

                        <span>
                            Total Projects
                        </span>

                        <strong>
                            {projects.length}
                        </strong>

                    </div>

                </div>

                <div className="stat-card">

                    <div className="stat-icon pending-icon">
                        S
                    </div>

                    <div>

                        <span>
                            Submitted
                        </span>

                        <strong>
                            {submittedCount}
                        </strong>

                    </div>

                </div>

                <div className="stat-card">

                    <div className="stat-icon approved-icon">
                        ✓
                    </div>

                    <div>

                        <span>
                            Approved
                        </span>

                        <strong>
                            {approvedCount}
                        </strong>

                    </div>

                </div>

                <div className="stat-card">

                    <div className="stat-icon rejected-icon">
                        !
                    </div>

                    <div>

                        <span>
                            Rejected
                        </span>

                        <strong>
                            {rejectedCount}
                        </strong>

                    </div>

                </div>

            </div>

            {/* Projects */}
            <div className="projects-section">

                <div className="section-header">

                    <div>

                        <h2>
                            My Projects
                        </h2>

                        <p>
                            Manage and monitor your carbon
                            reduction projects.
                        </p>

                    </div>

                    <button
                        className="secondary-button"
                        onClick={() =>
                            navigate("/projects")
                        }
                    >
                        View All
                    </button>

                </div>

                {loading && (
                    <LoadingSpinner
                        message="Loading your projects..."
                    />
                )}

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                {!loading &&
                    !error &&
                    projects.length === 0 && (
                        <div className="empty-state">

                            <div className="empty-icon">
                                +
                            </div>

                            <h3>
                                No projects yet
                            </h3>

                            <p>
                                Create your first carbon
                                reduction project to get started.
                            </p>

                            <button
                                className="primary-button"
                                onClick={() =>
                                    navigate(
                                        "/projects/create"
                                    )
                                }
                            >
                                Create Your First Project
                            </button>

                        </div>
                    )}

                {!loading &&
                    !error &&
                    projects.length > 0 && (
                        <div className="project-grid">

                            {projects.map((project) => (
                                <div
                                    className="project-card"
                                    key={project.project_id}
                                >

                                    <div className="project-card-top">

                                        <div className="project-type">
                                            {project.project_type}
                                        </div>

                                        <StatusBadge
                                            status={
                                                project.status
                                            }
                                        />

                                    </div>

                                    <h3>
                                        {project.project_name}
                                    </h3>

                                    <div className="project-info">

                                        <div>

                                            <span>
                                                Location
                                            </span>

                                            <strong>
                                                {project.location}
                                            </strong>

                                        </div>

                                        <div>

                                            <span>
                                                CO₂ Reduction
                                            </span>

                                            <strong>
                                                {
                                                    project.estimated_co2_reduction
                                                }{" "}
                                                tonnes
                                            </strong>

                                        </div>

                                    </div>

                                    <div className="project-dates">

                                        <span>
                                            Start
                                        </span>

                                        <strong>
                                            {project.start_date
                                                ? new Date(
                                                      project.start_date
                                                  ).toLocaleDateString()
                                                : "—"}
                                        </strong>

                                        <span>
                                            End
                                        </span>

                                        <strong>
                                            {project.end_date
                                                ? new Date(
                                                      project.end_date
                                                  ).toLocaleDateString()
                                                : "—"}
                                        </strong>

                                    </div>

                                    {/* CRUD Actions */}
                                    {project.status ===
                                        "SUBMITTED" && (
                                        <div
                                            className="form-actions"
                                            style={{
                                                marginTop:
                                                    "1rem"
                                            }}
                                        >

                                            <button
                                                type="button"
                                                className="secondary-button"
                                                onClick={() =>
                                                    navigate(
                                                        `/projects/edit/${project.project_id}`
                                                    )
                                                }
                                                disabled={
                                                    deleting ===
                                                    project.project_id
                                                }
                                            >
                                                Edit
                                            </button>

                                            <button
                                                type="button"
                                                className="secondary-button"
                                                onClick={() =>
                                                    handleDelete(
                                                        project.project_id
                                                    )
                                                }
                                                disabled={
                                                    deleting ===
                                                    project.project_id
                                                }
                                            >
                                                {deleting ===
                                                project.project_id
                                                    ? "Deleting..."
                                                    : "Delete"}
                                            </button>

                                        </div>
                                    )}

                                </div>
                            ))}

                        </div>
                    )}

            </div>

        </div>
    );
}

export default SellerDashboard;