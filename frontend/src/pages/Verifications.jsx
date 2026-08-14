import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";

function Verifications() {
    const navigate = useNavigate();

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await api.get("/projects");

                const submittedProjects = (
                    response.data.data || []
                ).filter(
                    (project) =>
                        project.status === "SUBMITTED"
                );

                setProjects(submittedProjects);
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

    return (
        <div className="verification-page">

            {/* Header */}
            <div className="page-header">
                <p className="eyebrow">
                    VERIFIER PORTAL
                </p>

                <h1>
                    Verification Queue
                </h1>

                <p>
                    Review carbon projects submitted by
                    sellers and record verification decisions.
                </p>
            </div>

            {/* Queue Summary */}
            {!loading && !error && (
                <div className="verification-summary">
                    <div className="verification-summary-icon">
                        !
                    </div>

                    <div>
                        <span>
                            Projects Awaiting Verification
                        </span>

                        <strong>
                            {projects.length}
                        </strong>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <LoadingSpinner
                    message="Loading verification queue..."
                />
            )}

            {/* Error */}
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Empty */}
            {!loading &&
                !error &&
                projects.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-icon">
                            ✓
                        </div>

                        <h3>
                            Verification queue is clear
                        </h3>

                        <p>
                            There are currently no submitted
                            projects waiting for verification.
                        </p>
                    </div>
                )}

            {/* Projects */}
            {!loading &&
                !error &&
                projects.length > 0 && (
                    <div className="verification-project-list">

                        {projects.map((project) => (
                            <div
                                className="verification-project-card"
                                key={project.project_id}
                            >

                                <div className="verification-card-main">

                                    <div className="verification-card-header">

                                        <div>
                                            <p className="project-type">
                                                {project.project_type}
                                            </p>

                                            <h2>
                                                {project.project_name}
                                            </h2>
                                        </div>

                                        <StatusBadge
                                            status={project.status}
                                        />

                                    </div>

                                    <div className="verification-project-details">

                                        <div>
                                            <span>
                                                Seller
                                            </span>

                                            <strong>
                                                {project.owner_name ||
                                                    "—"}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Company
                                            </span>

                                            <strong>
                                                {project.company_name ||
                                                    "—"}
                                            </strong>
                                        </div>

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

                                    <div className="verification-project-dates">

                                        <div>
                                            <span>
                                                Start Date
                                            </span>

                                            <strong>
                                                {project.start_date
                                                    ? new Date(
                                                          project.start_date
                                                      ).toLocaleDateString()
                                                    : "—"}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                End Date
                                            </span>

                                            <strong>
                                                {project.end_date
                                                    ? new Date(
                                                          project.end_date
                                                      ).toLocaleDateString()
                                                    : "—"}
                                            </strong>
                                        </div>

                                    </div>

                                </div>

                                <div className="verification-card-action">

                                    <button
                                        className="primary-button"
                                        onClick={() =>
                                            navigate(
                                                `/verifications/${project.project_id}`
                                            )
                                        }
                                    >
                                        Review Project
                                    </button>

                                </div>

                            </div>
                        ))}

                    </div>
                )}

        </div>
    );
}

export default Verifications;