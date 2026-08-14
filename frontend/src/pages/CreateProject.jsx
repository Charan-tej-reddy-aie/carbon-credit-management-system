import { useState } from "react";
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

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

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

        if (
            formData.start_date &&
            formData.end_date &&
            new Date(formData.end_date) <=
                new Date(formData.start_date)
        ) {
            setError(
                "End date must be after the start date."
            );
            return;
        }

        if (
            Number(formData.estimated_co2_reduction) <= 0
        ) {
            setError(
                "Estimated CO₂ reduction must be greater than zero."
            );
            return;
        }

        setLoading(true);

        try {
            const response = await api.post("/projects", {
                ...formData,
                estimated_co2_reduction: Number(
                    formData.estimated_co2_reduction
                )
            });

            setMessage(response.data.message);

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

    return (
        <div className="create-project-page">

            {/* Page Header */}
            <div className="page-header">
                <p className="eyebrow">
                    SELLER PORTAL
                </p>

                <h1>
                    Create Carbon Project
                </h1>

                <p>
                    Submit a new carbon reduction project
                    for verification.
                </p>
            </div>

            {/* Messages */}
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

            {/* Form */}
            <div className="create-project-card">

                <div className="form-section-header">
                    <div>
                        <h2>
                            Project Information
                        </h2>

                        <p>
                            Provide the details of your
                            carbon reduction project.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>

                    {/* Project Name */}
                    <div className="form-group">
                        <label htmlFor="project_name">
                            Project Name
                        </label>

                        <input
                            id="project_name"
                            type="text"
                            name="project_name"
                            value={formData.project_name}
                            onChange={handleChange}
                            placeholder="Example: Wind Carbon Reduction Project"
                            required
                        />
                    </div>

                    {/* Type + Location */}
                    <div className="form-row">

                        <div className="form-group">
                            <label htmlFor="project_type">
                                Project Type
                            </label>

                            <select
                                id="project_type"
                                name="project_type"
                                value={formData.project_type}
                                onChange={handleChange}
                                required
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
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="Example: Andhra Pradesh, India"
                                required
                            />
                        </div>

                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label htmlFor="description">
                            Project Description
                        </label>

                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="6"
                            placeholder="Describe the project, its activities, and how it reduces carbon emissions."
                            required
                        />
                    </div>

                    {/* CO2 */}
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
                                onChange={handleChange}
                                min="0.01"
                                step="0.01"
                                placeholder="Example: 5000"
                                required
                            />

                            <span>
                                tonnes CO₂
                            </span>
                        </div>

                        <small className="field-help">
                            Enter the estimated amount of
                            carbon dioxide reduction expected
                            from this project.
                        </small>
                    </div>

                    {/* Dates */}
                    <div className="form-row">

                        <div className="form-group">
                            <label htmlFor="start_date">
                                Start Date
                            </label>

                            <input
                                id="start_date"
                                type="date"
                                name="start_date"
                                value={formData.start_date}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="end_date">
                                End Date
                            </label>

                            <input
                                id="end_date"
                                type="date"
                                name="end_date"
                                value={formData.end_date}
                                onChange={handleChange}
                                required
                            />
                        </div>

                    </div>

                    {/* Actions */}
                    <div className="form-actions">

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                                navigate("/dashboard")
                            }
                            disabled={loading}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="primary-button"
                            disabled={loading}
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