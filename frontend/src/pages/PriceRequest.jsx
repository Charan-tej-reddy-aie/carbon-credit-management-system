import "../carbonx-intelligence.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function PriceRequest() {
    const navigate = useNavigate();

    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [requestedPrice, setRequestedPrice] = useState("");
    const [description, setDescription] = useState("");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await api.get(
                    "/projects/my"
                );

                setProjects(
                    response.data.data || []
                );
            } catch (error) {
                setError(
                    error.response?.data?.message ||
                    "Failed to load your projects"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const selectedProjectData = projects.find(
        (project) =>
            String(project.project_id) ===
            String(selectedProject)
    );

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setMessage("");

        if (!selectedProject) {
            setError("Select a project.");
            return;
        }

        if (
            !requestedPrice ||
            Number(requestedPrice) <= 0
        ) {
            setError(
                "Enter a valid requested price."
            );
            return;
        }

        if (!description.trim()) {
            setError(
                "Please provide a reason for the price increase."
            );
            return;
        }

        setSubmitting(true);

        try {
            const response = await api.post(
                "/marketplace/price-request",
                {
                    project_id: Number(
                        selectedProject
                    ),
                    requested_price: Number(
                        requestedPrice
                    ),
                    description: description.trim()
                }
            );

            setMessage(
                response.data.message ||
                "Price increase request submitted successfully."
            );

            setRequestedPrice("");
            setDescription("");
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Failed to submit price request"
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="create-project-page cx-price-request-page">
                <div className="page-header">
                    <p className="eyebrow">
                        COMPANY PORTAL
                    </p>

                    <h1>
                        Request Price Increase
                    </h1>

                    <p>
                        Loading your projects...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="create-project-page cx-price-request-page">

            <div className="page-header">
                <p className="eyebrow">
                    COMPANY PORTAL
                </p>

                <h1>
                    Request Price Increase
                </h1>

                <p>
                    Request a higher selling price from
                    the verifier.
                </p>
            </div>

            {message && (
                <div className="success-message">
                    {message}
                </div>
            )}

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <div className="create-project-card cx-price-request-card">

                <div className="form-section-header">
                    <div>
                        <h2>
                            Price Increase Request
                        </h2>

                        <p>
                            The verifier will review your
                            requested price and reason.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>

                    <div className="form-group">
                        <label htmlFor="project">
                            Project
                        </label>

                        <select
                            id="project"
                            value={selectedProject}
                            onChange={(e) =>
                                setSelectedProject(
                                    e.target.value
                                )
                            }
                            required
                        >
                            <option value="">
                                Select project
                            </option>

                            {projects.map(
                                (project) => (
                                    <option
                                        key={
                                            project.project_id
                                        }
                                        value={
                                            project.project_id
                                        }
                                    >
                                        {
                                            project.project_name
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    {selectedProjectData && (
                        <div className="credit-alert positive-alert">
                            <div>
                                <p className="eyebrow">
                                    SELECTED PROJECT
                                </p>

                                <h2>
                                    {
                                        selectedProjectData.project_name
                                    }
                                </h2>

                                <p>
                                    Project status:{" "}
                                    <strong>
                                        {
                                            selectedProjectData.status
                                        }
                                    </strong>
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="requested_price">
                            Requested Price per Credit
                        </label>

                        <div className="input-with-unit">
                            <input
                                id="requested_price"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={requestedPrice}
                                onChange={(e) =>
                                    setRequestedPrice(
                                        e.target.value
                                    )
                                }
                                placeholder="Example: 25.00"
                                required
                            />

                            <span>
                                ₹ / credit
                            </span>
                        </div>

                        <small className="field-help">
                            The requested price must be
                            higher than the current
                            verifier-approved price.
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">
                            Reason for Price Increase
                        </label>

                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) =>
                                setDescription(
                                    e.target.value
                                )
                            }
                            rows="6"
                            placeholder="Explain why your company is requesting a higher price."
                            required
                        />
                    </div>

                    <div className="form-actions">

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                                navigate(
                                    "/marketplace/sell"
                                )
                            }
                            disabled={submitting}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="primary-button"
                            disabled={submitting}
                        >
                            {submitting
                                ? "Submitting..."
                                : "Send Request"}
                        </button>

                    </div>

                </form>
            </div>
        </div>
    );
}

export default PriceRequest;