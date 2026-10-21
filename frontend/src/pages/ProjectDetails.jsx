import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function ProjectDetails() {
    const { projectId } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const formatDate = (date) => {
        if (!date) return "-";

        const value = String(date).slice(0, 10);
        const [year, month, day] = value.split("-");

        return `${day}-${month}-${year}`;
    };

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const response = await api.get(
                    `/projects/${projectId}`
                );

                setProject(response.data.data);
            } catch (error) {
                setError(
                    error.response?.data?.message ||
                    "Failed to load project"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchProject();
    }, [projectId]);
    const handleDeleteProject = async () => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this project?\n\n" +
            "A project can only be deleted before it is approved."
        );

        if (!confirmed) {
            return;
        }

        try {
            await api.delete(
                `/projects/${project.project_id}`
            );

            alert("Project deleted successfully.");

            navigate("/projects");

        } catch (error) {
            alert(
                error.response?.data?.message ||
                "Failed to delete project"
            );
        }
        };

    const getStatusClass = (status) => {
        switch (status) {
            case "SUBMITTED":
                return "status-badge pending";

            case "IN_PROGRESS":
                return "status-badge progress";

            case "CREDITS_ISSUED":
                return "status-badge success";

            case "COMPLETED":
                return "status-badge success";

            case "REJECTED":
                return "status-badge danger";

            default:
                return "status-badge";
        }
    };

    if (loading) {
        return (
            <div className="dashboard-page">
                <div className="page-header">
                    <p className="eyebrow">
                        COMPANY PORTAL
                    </p>

                    <h1>
                        Project Details
                    </h1>

                    <p>
                        Loading project information...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-page">
                <div className="page-header">
                    <p className="eyebrow">
                        COMPANY PORTAL
                    </p>

                    <h1>
                        Project Details
                    </h1>
                </div>

                <div className="error-message">
                    {error}
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                            navigate("/projects")
                        }
                    >
                        Back to My Projects
                    </button>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="dashboard-page">
                <div className="page-header">
                    <p className="eyebrow">
                        COMPANY PORTAL
                    </p>

                    <h1>
                        Project Not Found
                    </h1>

                    <p>
                        The requested project could not
                        be found.
                    </p>
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        className="primary-button"
                        onClick={() =>
                            navigate("/projects")
                        }
                    >
                        Back to My Projects
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">

            <div className="page-header">

                <div>
                    <p className="eyebrow">
                        COMPANY PORTAL
                    </p>

                    <h1>
                        {project.project_name}
                    </h1>

                    <p>
                        View the complete details and
                        current status of this project.
                    </p>
                </div>

                <span
                    className={getStatusClass(
                        project.status
                    )}
                >
                    {project.status}
                </span>

            </div>

            <div className="dashboard-section">

                <div className="section-header">
                    <div>
                        <p className="eyebrow">
                            PROJECT INFORMATION
                        </p>

                        <h2>
                            Project #{project.project_id}
                        </h2>
                    </div>
                </div>

                <div className="dashboard-statistics">

                    <div className="stat-card">
                        <span>
                            Project Type
                        </span>

                        <strong>
                            {project.project_type}
                        </strong>
                    </div>

                    <div className="stat-card">
                        <span>
                            Estimated CO₂ Reduction
                        </span>

                        <strong>
                            {
                                project.estimated_co2_reduction
                            }
                        </strong>
                    </div>

                    <div className="stat-card">
                        <span>
                            Location
                        </span>

                        <strong>
                            {project.location}
                        </strong>
                    </div>

                </div>

            </div>

            <div className="create-project-card">

                <div className="form-section-header">
                    <div>
                        <h2>
                            Project Description
                        </h2>

                        <p>
                            Description submitted for
                            verification.
                        </p>
                    </div>
                </div>

                <div className="project-details">

                    <p>
                        {project.description}
                    </p>

                </div>

            </div>

            <div className="create-project-card">

                <div className="form-section-header">
                    <div>
                        <h2>
                            Project Timeline
                        </h2>

                        <p>
                            Scheduled project duration.
                        </p>
                    </div>
                </div>

                <div className="dashboard-statistics">

                    <div className="stat-card">
                        <span>
                            Start Date
                        </span>

                        <strong>
                            {formatDate(
                                project.start_date
                            )}
                        </strong>
                    </div>

                    <div className="stat-card">
                        <span>
                            End Date
                        </span>

                        <strong>
                            {formatDate(
                                project.end_date
                            )}
                        </strong>
                    </div>

                    <div className="stat-card">
                        <span>
                            Status
                        </span>

                        <strong>
                            {project.status}
                        </strong>
                    </div>

                </div>

            </div>

            <div className="create-project-card">

                <div className="form-section-header">
                    <div>
                        <h2>
                            Project Ownership
                        </h2>

                        <p>
                            Company responsible for this
                            project.
                        </p>
                    </div>
                </div>

                <div className="project-details">

                    <p>
                        <strong>
                            Company:
                        </strong>{" "}
                        {project.company_name || "-"}
                    </p>

                    <p>
                        <strong>
                            Owner:
                        </strong>{" "}
                        {project.owner_name || "-"}
                    </p>

                    <p>
                        <strong>
                            Project ID:
                        </strong>{" "}
                        {project.project_id}
                    </p>

                </div>

            </div>

            <div className="form-actions">

    <button
        type="button"
        className="secondary-button"
        onClick={() =>
            navigate("/projects")
        }
    >
        Back to My Projects
    </button>

    <div className="project-action-buttons">

        {project.status === "SUBMITTED" && (
            <>
                <button
                    type="button"
                    className="primary-button"
                    onClick={() =>
                        navigate(
                            `/projects/edit/${project.project_id}`
                        )
                    }
                >
                    Edit Project
                </button>

                <button
                    type="button"
                    className="delete-button"
                    onClick={handleDeleteProject}
                >
                    Delete Project
                </button>
            </>
        )}

        {project.status === "REJECTED" && (
            <button
                type="button"
                className="delete-button"
                onClick={handleDeleteProject}
            >
                Delete Project
            </button>
        )}

    </div>

</div>

        </div>
    );
}

export default ProjectDetails;