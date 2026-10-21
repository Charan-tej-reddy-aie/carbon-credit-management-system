
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Login.css";

function Register() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        password: "",
        confirm_password: "",
        company_name: "",
        wallet_address: "",
        country: ""
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
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setMessage("");
        setError("");

        if (formData.password !== formData.confirm_password) {
            setError("Passwords do not match.");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);

        try {
            const response = await api.post(
                "/auth/register",
                {
                    full_name: formData.full_name,
                    email: formData.email,
                    password: formData.password,
                    company_name: formData.company_name,
                    wallet_address: formData.wallet_address || null,
                    country: formData.country || null
                }
            );

            setMessage(
                response.data.message ||
                "Company account registered successfully."
            );

            setTimeout(() => {
                navigate("/login");
            }, 1500);

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Registration failed"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="carbon-login carbon-register-page">
            <div className="carbon-login-overlay" aria-hidden="true" />

            <div className="auth-container register-container">
                <div className="auth-brand">
                    <div className="brand-icon">CO₂</div>

                    <div>
                        <h1>Carbon Credit</h1>
                        <p>Management System</p>
                    </div>
                </div>

                <div className="auth-card register-card">
                    <div className="auth-header">
                        <p className="eyebrow">COMPANY PORTAL</p>

                        <h2>Create Company Account</h2>

                        <p>
                            Register your organization to
                            manage carbon projects and
                            carbon credits.
                        </p>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="success-message">
                            {message}
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        className="auth-form"
                    >
                        <div className="form-group">
                            <label htmlFor="full_name">
                                Full Name
                            </label>

                            <input
                                id="full_name"
                                type="text"
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="company_name">
                                Company Name
                            </label>

                            <input
                                id="company_name"
                                type="text"
                                name="company_name"
                                value={formData.company_name}
                                onChange={handleChange}
                                placeholder="Enter your company name"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">
                                Email Address
                            </label>

                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter your email"
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="password">
                                    Password
                                </label>

                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Minimum 6 characters"
                                    minLength="6"
                                    autoComplete="new-password"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirm_password">
                                    Confirm Password
                                </label>

                                <input
                                    id="confirm_password"
                                    type="password"
                                    name="confirm_password"
                                    value={formData.confirm_password}
                                    onChange={handleChange}
                                    placeholder="Re-enter password"
                                    minLength="6"
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="wallet_address">
                                    Wallet Address
                                </label>

                                <input
                                    id="wallet_address"
                                    type="text"
                                    name="wallet_address"
                                    value={formData.wallet_address}
                                    onChange={handleChange}
                                    placeholder="Optional"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="country">
                                    Country
                                </label>

                                <input
                                    id="country"
                                    type="text"
                                    name="country"
                                    value={formData.country}
                                    onChange={handleChange}
                                    placeholder="Example: India"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="primary-button auth-submit"
                            disabled={loading}
                        >
                            {loading
                                ? "Creating Account..."
                                : "Create Company Account"}
                        </button>
                    </form>

                    <div className="auth-divider">
                        <span>Already have an account?</span>
                    </div>

                    <button
                        type="button"
                        className="secondary-button auth-register"
                        onClick={() => navigate("/login")}
                    >
                        Back to Login
                    </button>
                </div>

                <p className="auth-footer">
                    Carbon Credit Management System
                </p>
            </div>
        </main>
    );
}

export default Register;
