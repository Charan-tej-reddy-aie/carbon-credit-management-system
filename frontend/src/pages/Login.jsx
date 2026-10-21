
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const user = await login(email, password);

            if (user.role === "ADMIN") {
                navigate("/admin-dashboard");
            } else if (user.role === "VERIFIER") {
                navigate("/verifier-dashboard");
            } else if (user.role === "COMPANY") {
                navigate("/dashboard");
            } else {
                setMessage("Invalid user role");
            }
        } catch (error) {
            setMessage(
                error.response?.data?.message || "Login failed"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="carbon-login">
            <div className="carbon-login-overlay" aria-hidden="true" />

            <header className="carbon-brand">
                <div className="carbon-brand-mark">
                    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
                        <path
                            d="M39 5C22 7 9 16 9 29c0 7 5 12 12 12C35 41 40 22 39 5Z"
                            fill="currentColor"
                        />
                        <path
                            d="M8 43C15 30 23 22 34 13"
                            stroke="#DFF4E5"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                        />
                    </svg>
                </div>
                <div>
                    <h1>Carbon<span>X</span></h1>
                    <p>Carbon Credit Management</p>
                </div>
            </header>

            <section className="carbon-login-card">
                <div className="carbon-pill">
                    <span className="carbon-pill-dot" />
                    SUSTAINABLE TOMORROW
                </div>

                <h2>
                    Welcome <span>Back</span>
                </h2>

                <p className="carbon-login-description">
                    Manage carbon projects, trade verified credits,
                    and track your environmental impact.
                </p>

                {message && (
                    <div className="carbon-login-error" role="alert">
                        {message}
                    </div>
                )}

                <form onSubmit={handleLogin} className="carbon-login-form">
                    <div className="carbon-field">
                        <label htmlFor="email">Email Address</label>
                        <div className="carbon-input-wrap">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <rect x="3" y="5" width="18" height="14" rx="2" />
                                <path d="m4 7 8 6 8-6" />
                            </svg>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@company.com"
                                autoComplete="email"
                                required
                            />
                        </div>
                    </div>

                    <div className="carbon-field">
                        <label htmlFor="password">Password</label>
                        <div className="carbon-input-wrap">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <rect x="4" y="10" width="16" height="11" rx="2" />
                                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                                <path d="M12 14v3" />
                            </svg>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                className="carbon-password-toggle"
                                onClick={() => setShowPassword((value) => !value)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M3 3l18 18" />
                                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                                        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.5 0 9 7 9 7a16 16 0 0 1-3 3.8" />
                                        <path d="M6.2 6.2A16 16 0 0 0 3 12s3.5 7 9 7a10 10 0 0 0 3-.5" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="carbon-signin-button"
                        disabled={loading}
                    >
                        {loading ? "Signing in..." : "Sign In"}
                        {!loading && <span aria-hidden="true">→</span>}
                    </button>
                </form>

                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.6rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Demo Accounts (1-Click Fill)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={() => { setEmail("admin@carbon.com"); setPassword("Admin@123"); setMessage(""); }}
                            style={{ padding: '0.5rem 0.25rem', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', color: '#93c5fd', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 500 }}
                        >
                            👑 Admin
                        </button>
                        <button
                            type="button"
                            onClick={() => { setEmail("priya@ecoforest.com"); setPassword("Company@123"); setMessage(""); }}
                            style={{ padding: '0.5rem 0.25rem', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', color: '#86efac', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 500 }}
                        >
                            🏢 Company
                        </button>
                        <button
                            type="button"
                            onClick={() => { setEmail("amit@carbontrust.org"); setPassword("Verifier@123"); setMessage(""); }}
                            style={{ padding: '0.5rem 0.25rem', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', color: '#d8b4fe', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 500 }}
                        >
                            ✓ Verifier
                        </button>
                    </div>
                </div>

                <div className="carbon-register-divider">
                    <span />
                    <p>OR</p>
                    <span />
                </div>

                <button
                    type="button"
                    className="carbon-register-button"
                    onClick={() => navigate("/register")}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h1m4 0h1m-6 4h1m4 0h1M10 21v-4h4v4" />
                    </svg>
                    Create Company Account
                </button>

                <div className="carbon-login-trust">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 3 20 6v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3Z" />
                        <path d="m8.5 12 2.3 2.3 4.7-5" />
                    </svg>
                    <span>Verified projects. Transparent markets. Measurable impact.</span>
                </div>
            </section>

            <div className="carbon-environment-label carbon-emissions-label">
                <span className="carbon-emissions-icon">CO₂</span>
                <div>
                    <strong>High Emissions</strong>
                    <small>A challenge we can change</small>
                </div>
            </div>

            <div className="carbon-environment-label carbon-clean-label">
                <span className="carbon-clean-icon">↗</span>
                <div>
                    <strong>Cleaner Energy</strong>
                    <small>A greener future</small>
                </div>
            </div>

            <footer className="carbon-login-footer">
                <div className="carbon-footer-item">
                    <span className="carbon-footer-symbol">♧</span>
                    <div>
                        <strong>Register Projects</strong>
                        <small>Support climate action</small>
                    </div>
                </div>
                <div className="carbon-footer-item">
                    <span className="carbon-footer-symbol">◇</span>
                    <div>
                        <strong>Verify Credits</strong>
                        <small>Ensure quality and trust</small>
                    </div>
                </div>
                <div className="carbon-footer-item">
                    <span className="carbon-footer-symbol">⇄</span>
                    <div>
                        <strong>Trade Credits</strong>
                        <small>Transparent and secure</small>
                    </div>
                </div>
                <div className="carbon-footer-item">
                    <span className="carbon-footer-symbol">♧</span>
                    <div>
                        <strong>Reduce CO₂</strong>
                        <small>Build a sustainable future</small>
                    </div>
                </div>
            </footer>
        </main>
    );
}

export default Login;
