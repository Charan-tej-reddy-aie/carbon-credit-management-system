import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar({ onMenuClick }) {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <header className="navbar">
            <button
                type="button"
                className="mobile-menu-button"
                onClick={onMenuClick}
                aria-label="Toggle navigation menu"
                aria-expanded={undefined}
            >
                ☰
            </button>
            <div className="navbar-brand">
                <div className="navbar-logo" aria-hidden="true">C</div>
                <div>
                    <div className="navbar-title">CarbonX</div>
                    <div className="navbar-subtitle">Carbon Credit Management</div>
                </div>
            </div>
            <div className="navbar-user">
                <div className="navbar-user-info">
                    <strong>{user?.full_name || user?.email || "User"}</strong>
                    <span>{user?.role || "Account"}</span>
                </div>
                <button type="button" className="navbar-logout" onClick={handleLogout}>Log out</button>
            </div>
        </header>
    );
}

export default Navbar;
