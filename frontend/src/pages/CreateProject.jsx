import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function CreateProject() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        project_name: "",
        project_type: "",
        description: "",
        location: "",
        estimated_co2_reduction: "",
        start_date: "",
        end_date: ""
    });

    const [creditSummary, setCreditSummary] = useState(null);
    const [checkingCredits, setCheckingCredits] = useState(true);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const getToday = () => {
        const now = new Date();

        const year = now.getFullYear();
        const month = String(
            now.getMonth() + 1
        ).padStart(2, "0");
        const day = String(
            now.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const today = getToday();

    useEffect(() => {
        const fetchCreditSummary = async () => {
            try {
                const response = await api.get(
                    "/marketplace/credit-summary"
                );

                setCreditSummary(
                    response.data.data || null
                );
            } catch (error) {
                setError(
                    error.response?.data?.message ||
                    "Unable to check company credit balance."
                );
            } finally {
                setCheckingCredits(false);
            }
        };

        fetchCreditSummary();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value
        }));

        setError("");
        setMessage("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setMessage("");
        setError("");

        if (creditSummary?.credit_difference < 0) {
            setError(
                `You have a credit deficit of ${Math.abs(
                    Number(
                        creditSummary.credit_difference
                    )
                )} credits. Purchase carbon credits before creating a new project.`
            );

            return;
        }

        if (!formData.start_date) {
            setError(
                "Please select a start date."
            );

            return;
        }

        if (formData.start_date < today) {
            setError(
                "Start date cannot be earlier than today's date."
            );

            return;
        }

        if (!formData.end_date) {
            setError(
                "Please select an end date."
            );

            return;
        }

        if (
            formData.end_date <=
            formData.start_date
        ) {
            setError(
                "End date must be after the start date."
            );

            return;
        }

        if (
            Number(
                formData.estimated_co2_reduction
            ) <= 0
        ) {
            setError(
                "Estimated CO₂ reduction must be greater than zero."
            );

            return;
        }

        setLoading(true);

        try {
            const response = await api.post(
                "/projects",
                {
                    ...formData,
                    estimated_co2_reduction:
                        Number(
                            formData.estimated_co2_reduction
                        )
                }
            );

            setMessage(
                response.data.message
            );

            setTimeout(() => {
                navigate("/dashboard");
            }, 1000);

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Failed to create project"
            );
        } finally {
            setLoading(false);
        }
    };

    if (checkingCredits) {
        return (
            <div className="create-project-page">
                <div className="page-header">
                    <p className="eyebrow">
                        COMPANY PORTAL
                    </p>

                    <h1>
                        Create Carbon Project
                    </h1>

                    <p>
                        Checking your carbon credit
                        balance...
                    </p>
                </div>
            </div>
        );
    }

    const creditDifference = Number(
        creditSummary?.credit_difference || 0
    );

    const creditsToPurchase = Number(
        creditSummary?.credits_to_purchase || 0
    );

    const hasCreditDeficit =
        creditDifference < 0;

    return (
        <div className="create-project-page">

            <div className="page-header">
                <p className="eyebrow">
                    COMPANY PORTAL
                </p>

                <h1>
                    Create Carbon Project
                </h1>

                <p>
                    Submit a new carbon reduction
                    project for verification.
                </p>
            </div>

            {hasCreditDeficit && (
                <div className="credit-alert danger-alert">
                    <div>
                        <p className="eyebrow">
                            PROJECT CREATION BLOCKED
                        </p>

                        <h2>
                            Credit Deficit
                        </h2>

                        <p>
                            Your company has a
                            deficit of{" "}
                            <strong>
                                {Math.abs(
                                    creditDifference
                                )}
                            </strong>{" "}
                            carbon credits.
                        </p>

                        <p>
                            Purchase at least{" "}
                            <strong>
                                {creditsToPurchase}
                            </strong>{" "}
                            credits before creating
                            a new project.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="primary-button"
                        onClick={() =>
                            navigate(
                                "/marketplace"
                            )
                        }
                    >
                        Buy Credits
                    </button>
                </div>
            )}

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

            {!hasCreditDeficit && (
                <div className="credit-alert positive-alert">
                    <div>
                        <p className="eyebrow">
                            CREDIT STATUS
                        </p>

                        <h2>
                            Project Creation Available
                        </h2>

                        <p>
                            Your company has
                            sufficient carbon
                            credits to create a
                            new project.
                        </p>
                    </div>
                </div>
            )}

            <div className="create-project-card">

                <div className="form-section-header">
                    <div>
                        <h2>
                            Project Information
                        </h2>

                        <p>
                            Provide the details of
                            your carbon reduction
                            project.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>

                    <div className="form-group">
                        <label htmlFor="project_name">
                            Project Name
                        </label>

                        <input
                            id="project_name"
                            type="text"
                            name="project_name"
                            value={
                                formData.project_name
                            }
                            onChange={handleChange}
                            placeholder="Example: Wind Carbon Reduction Project"
                            required
                            disabled={
                                hasCreditDeficit
                            }
                        />
                    </div>

                    <div className="form-row">

                        <div className="form-group">
                            <label htmlFor="project_type">
                                Project Type
                            </label>

                            <select
                                id="project_type"
                                name="project_type"
                                value={
                                    formData.project_type
                                }
                                onChange={
                                    handleChange
                                }
                                required
                                disabled={
                                    hasCreditDeficit
                                }
                            >
                                <option value="">
                                    Select project type
                                </option>

                                <option value="Renewable Energy">
                                    Renewable Energy
                                </option>

                                <option value="Wind Energy">
                                    Wind Energy
                                </option>

                                <option value="Forestry">
                                    Forestry
                                </option>

                                <option value="Waste Management">
                                    Waste Management
                                </option>

                                <option value="Energy Efficiency">
                                    Energy Efficiency
                                </option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="location">
                                Location
                            </label>

                            <input
                                id="location"
                                type="text"
                                name="location"
                                value={
                                    formData.location
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="Example: Andhra Pradesh, India"
                                required
                                disabled={
                                    hasCreditDeficit
                                }
                            />
                        </div>

                    </div>

                    <div className="form-group">
                        <label htmlFor="description">
                            Project Description
                        </label>

                        <textarea
                            id="description"
                            name="description"
                            value={
                                formData.description
                            }
                            onChange={
                                handleChange
                            }
                            rows="6"
                            placeholder="Describe the project, its activities, and how it reduces carbon emissions."
                            required
                            disabled={
                                hasCreditDeficit
                            }
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="estimated_co2_reduction">
                            Estimated CO₂ Reduction
                        </label>

                        <div className="input-with-unit">
                            <input
                                id="estimated_co2_reduction"
                                type="number"
                                name="estimated_co2_reduction"
                                value={
                                    formData.estimated_co2_reduction
                                }
                                onChange={
                                    handleChange
                                }
                                min="0.01"
                                step="0.01"
                                placeholder="Example: 5000"
                                required
                                disabled={
                                    hasCreditDeficit
                                }
                            />

                            <span>
                                tonnes CO₂
                            </span>
                        </div>

                        <small className="field-help">
                            Enter the estimated amount
                            of carbon dioxide reduction
                            expected from this project.
                        </small>
                    </div>

                    <div className="form-row">

                        <div className="form-group">
                            <label htmlFor="start_date">
                                Start Date
                            </label>

                            <input
                                id="start_date"
                                type="date"
                                name="start_date"
                                value={
                                    formData.start_date
                                }
                                onChange={
                                    handleChange
                                }
                                min={today}
                                required
                                disabled={
                                    hasCreditDeficit
                                }
                            />

                            <small className="field-help">
                                Start date cannot be
                                earlier than today.
                            </small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="end_date">
                                End Date
                            </label>

                            <input
                                id="end_date"
                                type="date"
                                name="end_date"
                                value={
                                    formData.end_date
                                }
                                onChange={
                                    handleChange
                                }
                                min={
                                    formData.start_date ||
                                    today
                                }
                                required
                                disabled={
                                    hasCreditDeficit
                                }
                            />

                            <small className="field-help">
                                End date must be after
                                the start date.
                            </small>
                        </div>

                    </div>

                    <div className="form-actions">

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                                navigate(
                                    "/dashboard"
                                )
                            }
                            disabled={loading}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="primary-button"
                            disabled={
                                loading ||
                                hasCreditDeficit
                            }
                        >
                            {loading
                                ? "Submitting..."
                                : "Submit Project"}
                        </button>

                    </div>

                </form>
            </div>

        </div>
    );
}

export default CreateProject;