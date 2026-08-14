import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";

function VerifyProject() {
    const { projectId } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState(null);

    const [verifiedCo2, setVerifiedCo2] = useState("");
    const [status, setStatus] = useState("APPROVED");
    const [remarks, setRemarks] = useState("");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const response = await api.get(
                    `/projects/${projectId}`
                );

                const projectData = response.data.data;

                setProject(projectData);

                setVerifiedCo2(
                    projectData.estimated_co2_reduction
                );
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setMessage("");

        const verifiedValue = Number(verifiedCo2);
        const estimatedValue = Number(
            project?.estimated_co2_reduction
        );

        // Frontend validation
        if (verifiedValue <= 0) {
            setError(
                "Verified CO₂ reduction must be greater than zero."
            );
            return;
        }

        if (verifiedValue > estimatedValue) {
            setError(
                "Verified CO₂ reduction cannot exceed the estimated reduction."
            );
            return;
        }

        if (!remarks.trim()) {
            setError(
                "Please enter verification remarks."
            );
            return;
        }

        const decisionText =
            status === "APPROVED"
                ? "approve"
                : "reject";

        const confirmed = window.confirm(
            `Are you sure you want to ${decisionText} this project?`
        );

        if (!confirmed) {
            return;
        }

        setSubmitting(true);

        try {
            const response = await api.post(
                "/verifications",
                {
                    project_id: Number(projectId),
                    verified_co2_reduction: verifiedValue,
                    status,
                    remarks: remarks.trim()
                }
            );

            setMessage(response.data.message);

            setTimeout(() => {
                navigate("/verifications");
            }, 1200);

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Failed to submit verification"
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <LoadingSpinner
                message="Loading project..."
            />
        );
    }

    if (!project) {
        return (
            <div className="page-container">
                <div className="error-message">
                    {error || "Project not found"}
                </div>

                <button
                    className="secondary-button"
                    onClick={() =>
                        navigate("/verifications")
                    }
                >
                    Back to Verification Queue
                </button>
            </div>
        );
    }

    return (
        <div className="verification-page">

            {/* Page Header */}
            <div className="page-header">

                <div>
                    <p className="eyebrow">
                        PROJECT VERIFICATION
                    </p>

                    <h1>
                        Review Project
                    </h1>

                    <p>
                        Verify the submitted carbon project
                        information before making a decision.
                    </p>
                </div>

                <button
                    className="secondary-button"
                    onClick={() =>
                        navigate("/verifications")
                    }
                >
                    ← Back to Queue
                </button>

            </div>

            {/* Error */}
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Success */}
            {message && (
                <div className="success-message">
                    {message}
                </div>
            )}

            {/* Project Information */}
            <div className="verification-layout">

                <div className="project-details-card">

                    <div className="card-header">
                        <div>
                            <p className="eyebrow">
                                PROJECT DETAILS
                            </p>

                            <h2>
                                {project.project_name}
                            </h2>
                        </div>

                        <span className="status-badge submitted">
                            {project.status}
                        </span>
                    </div>

                    <div className="details-grid">

                        <div className="detail-item">
                            <span>Project ID</span>
                            <strong>
                                #{project.project_id}
                            </strong>
                        </div>

                        <div className="detail-item">
                            <span>Project Type</span>
                            <strong>
                                {project.project_type}
                            </strong>
                        </div>

                        <div className="detail-item">
                            <span>Project Owner</span>
                            <strong>
                                {project.owner_name}
                            </strong>
                        </div>

                        <div className="detail-item">
                            <span>Company</span>
                            <strong>
                                {project.company_name}
                            </strong>
                        </div>

                        <div className="detail-item">
                            <span>Location</span>
                            <strong>
                                {project.location}
                            </strong>
                        </div>

                        <div className="detail-item">
                            <span>Estimated CO₂ Reduction</span>
                            <strong>
                                {project.estimated_co2_reduction}
                            </strong>
                        </div>

                        <div className="detail-item">
                            <span>Start Date</span>
                            <strong>
                                {project.start_date}
                            </strong>
                        </div>

                        <div className="detail-item">
                            <span>End Date</span>
                            <strong>
                                {project.end_date}
                            </strong>
                        </div>

                    </div>

                    <div className="description-section">

                        <span>
                            Project Description
                        </span>

                        <p>
                            {project.description}
                        </p>

                    </div>

                </div>

                {/* Verification Form */}
                <div className="verification-form-card">

                    <div className="card-header">

                        <div>
                            <p className="eyebrow">
                                VERIFICATION DECISION
                            </p>

                            <h2>
                                Review & Decide
                            </h2>
                        </div>

                    </div>

                    <form onSubmit={handleSubmit}>

                        {/* Verified CO2 */}
                        <div className="form-group">

                            <label>
                                Verified CO₂ Reduction
                            </label>

                            <input
                                type="number"
                                value={verifiedCo2}
                                onChange={(e) =>
                                    setVerifiedCo2(
                                        e.target.value
                                    )
                                }
                                min="0.01"
                                max={
                                    project.estimated_co2_reduction
                                }
                                step="0.01"
                                required
                            />

                            <small>
                                Maximum allowed:{" "}
                                {
                                    project.estimated_co2_reduction
                                }
                            </small>

                        </div>

                        {/* Decision */}
                        <div className="form-group">

                            <label>
                                Verification Decision
                            </label>

                            <div className="decision-options">

                                <button
                                    type="button"
                                    className={
                                        status === "APPROVED"
                                            ? "decision-button active approve"
                                            : "decision-button"
                                    }
                                    onClick={() =>
                                        setStatus("APPROVED")
                                    }
                                >
                                    ✓ Approve
                                </button>

                                <button
                                    type="button"
                                    className={
                                        status === "REJECTED"
                                            ? "decision-button active reject"
                                            : "decision-button"
                                    }
                                    onClick={() =>
                                        setStatus("REJECTED")
                                    }
                                >
                                    × Reject
                                </button>

                            </div>

                        </div>

                        {/* Remarks */}
                        <div className="form-group">

                            <label>
                                Verification Remarks
                            </label>

                            <textarea
                                value={remarks}
                                onChange={(e) =>
                                    setRemarks(
                                        e.target.value
                                    )
                                }
                                rows="6"
                                placeholder={
                                    status === "APPROVED"
                                        ? "Explain why the project has been approved..."
                                        : "Explain why the project has been rejected..."
                                }
                                required
                            />

                        </div>

                        {/* Decision Summary */}
                        <div
                            className={
                                status === "APPROVED"
                                    ? "decision-summary approved-summary"
                                    : "decision-summary rejected-summary"
                            }
                        >

                            <strong>
                                {status === "APPROVED"
                                    ? "✓ Project will be APPROVED"
                                    : "× Project will be REJECTED"}
                            </strong>

                            <p>
                                Verified CO₂ reduction:{" "}
                                {verifiedCo2 || "0"}
                            </p>

                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            className={
                                status === "APPROVED"
                                    ? "submit-button approve-submit"
                                    : "submit-button reject-submit"
                            }
                            disabled={submitting}
                        >
                            {submitting
                                ? "Submitting Verification..."
                                : status === "APPROVED"
                                    ? "Approve Project"
                                    : "Reject Project"}
                        </button>

                    </form>

                </div>

            </div>

        </div>
    );
}

export default VerifyProject;