import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            const user = await login(email, password);

            // Redirect according to role
            if (user.role === "SELLER") {
                navigate("/dashboard");
            } else if (user.role === "BUYER") {
                navigate("/buyer-dashboard");
            } else if (user.role === "VERIFIER") {
                navigate("/verifier-dashboard");
            } else {
                setError("Unknown user role.");
            }

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Login failed. Please check your credentials."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">

            <div className="login-container">

                {/* Branding */}
                <div className="login-brand">

                    <div className="login-logo">
                        C
                    </div>

                    <div>
                        <h1>CarbonX</h1>

                        <p>
                            Carbon Credit Management
                        </p>
                    </div>

                </div>

                {/* Login card */}
                <div className="login-card">

                    <div className="login-header">

                        <p className="eyebrow">
                            SECURE ACCESS
                        </p>

                        <h2>
                            Welcome back
                        </h2>

                        <p>
                            Sign in to your CarbonX account
                        </p>

                    </div>

                    <form onSubmit={handleLogin} autoComplete="off">

                        {/* Email */}
                        <div className="form-group">

                            <label htmlFor="email">
                                Email Address
                            </label>

                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
                                }
                                placeholder="Enter your email"
                                autoComplete="off"
                                required
                            />

                        </div>

                        {/* Password */}
                        <div className="form-group">

                            <label htmlFor="password">
                                Password
                            </label>

                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                placeholder="Enter your password"
                                autoComplete="new-password"
                                required
                            />

                        </div>

                        {/* Error */}
                        {error && (
                            <div className="login-error">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            className="login-button"
                            disabled={loading}
                        >
                            {loading
                                ? "Signing in..."
                                : "Sign In"}
                        </button>

                    </form>

                </div>

                {/* Footer */}
                <p className="login-footer">
                    CarbonX • Carbon Credit Management System
                </p>

            </div>

        </div>
    );
}

export default Login;