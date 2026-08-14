import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
function Navbar() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <header className="navbar">
            <div className="navbar-brand">
                <div className="navbar-logo">C</div>

                <div>
                    <div className="navbar-title">CarbonX</div>
                    <div className="navbar-subtitle">
                        Carbon Credit Management
                    </div>
                </div>
            </div>

            <div className="navbar-user">
                <div className="navbar-user-info">
                    <strong>
                        {user?.full_name || "User"}
                    </strong>

                    <span>
                        {user?.role || ""}
                    </span>
                </div>

                <button
                    className="navbar-logout"
                    onClick={handleLogout}
                >
                    Logout
                </button>
            </div>
        </header>
    );
}

export default Navbar;