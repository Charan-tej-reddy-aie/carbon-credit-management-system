import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";

function VerifierDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await api.get("/projects");

                setProjects(response.data.data || []);
            } catch (error) {
                setError(
                    error.response?.data?.message ||
                    "Failed to load verification statistics"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const pendingCount = projects.filter(
        (project) => project.status === "SUBMITTED"
    ).length;

    const approvedCount = projects.filter(
        (project) => project.status === "APPROVED"
    ).length;

    const rejectedCount = projects.filter(
        (project) => project.status === "REJECTED"
    ).length;

    return (
        <div className="verifier-dashboard">

            {/* Header */}
            <div className="verifier-header">
                <div>
                    <p className="eyebrow">
                        VERIFIER PORTAL
                    </p>

                    <h1>
                        Verifier Dashboard
                    </h1>

                    <p className="verifier-welcome">
                        Welcome back, {user?.full_name}
                    </p>
                </div>

                <button
                    className="primary-button"
                    onClick={() =>
                        navigate("/verifications")
                    }
                >
                    Review Projects
                </button>
            </div>

            {/* Organization */}
            <div className="verifier-company-card">

                <div>
                    <span>
                        Organization
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
                        {user?.role || "VERIFIER"}
                    </strong>
                </div>

            </div>

            {/* Loading */}
            {loading && (
                <LoadingSpinner
                    message="Loading verification statistics..."
                />
            )}

            {/* Error */}
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Statistics */}
            {!loading && !error && (
                <div className="stats-grid">

                    {/* Pending */}
                    <div className="stat-card">

                        <div className="stat-icon pending-icon">
                            !
                        </div>

                        <div>
                            <span>
                                Pending Reviews
                            </span>

                            <strong>
                                {pendingCount}
                            </strong>
                        </div>

                    </div>

                    {/* Approved */}
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

                    {/* Rejected */}
                    <div className="stat-card">

                        <div className="stat-icon rejected-icon">
                            ×
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

                    {/* Verification Center */}
                    <div className="stat-card">

                        <div className="stat-icon">
                            V
                        </div>

                        <div>
                            <span>
                                Verification Center
                            </span>

                            <strong>
                                Open
                            </strong>
                        </div>

                    </div>

                </div>
            )}

            {/* Verification action */}
            <div className="verification-action-card">

                <div className="verification-action-content">

                    <div className="verification-icon">
                        ✓
                    </div>

                    <div>
                        <h2>
                            Project Verification
                        </h2>

                        <p>
                            Review submitted carbon projects,
                            verify their information, and record
                            your verification decision.
                        </p>
                    </div>

                </div>

                <button
                    className="primary-button"
                    onClick={() =>
                        navigate("/verifications")
                    }
                >
                    Open Verification Queue
                </button>

            </div>

            {/* Information */}
            <div className="verification-info-grid">

                <div className="content-card">
                    <h3>
                        Your Role
                    </h3>

                    <p>
                        As a verifier, you review carbon
                        reduction projects submitted by
                        sellers before credits can proceed
                        through the verification process.
                    </p>
                </div>

                <div className="content-card">
                    <h3>
                        Next Step
                    </h3>

                    <p>
                        Open the verification queue to see
                        submitted projects and review their
                        details.
                    </p>

                    <button
                        className="secondary-button"
                        onClick={() =>
                            navigate("/verifications")
                        }
                    >
                        Go to Verification Queue
                    </button>
                </div>

            </div>

        </div>
    );
}

export default VerifierDashboard;