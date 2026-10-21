import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Sidebar({ isOpen = false, onNavigate = () => {} }) {
    const { user } = useAuth();

    const role = user?.role;

    const dashboardPath =
        role === "VERIFIER"
            ? "/verifier-dashboard"
            : role === "ADMIN"
            ? "/admin-dashboard"
            : "/dashboard";

    return (
        <aside className={`sidebar${isOpen ? " sidebar-open" : ""}`}>
            <div className="sidebar-section">
                <p className="sidebar-heading">
                    MAIN MENU
                </p>

                <NavLink
                    to={dashboardPath}
                    className="sidebar-link"
                    onClick={onNavigate}
                >
                    <span>⌂</span>
                    Dashboard
                </NavLink>

                {role === "COMPANY" && (
                    <>
                        <NavLink
                            to="/projects"
                            className="sidebar-link"
                            onClick={onNavigate}
                        >
                            <span>▣</span>
                            My Projects
                        </NavLink>

                        <NavLink
                            to="/projects/create"
                            className="sidebar-link"
                            onClick={onNavigate}
                        >
                            <span>＋</span>
                            Create Project
                        </NavLink>

                        <NavLink to="/credits" className="sidebar-link" onClick={onNavigate}><span>▤</span>My Credits</NavLink>
                        <NavLink to="/wallet" className="sidebar-link" onClick={onNavigate}><span>◉</span>Wallet Settings</NavLink>
                        <NavLink to="/marketplace" className="sidebar-link" onClick={onNavigate}>
                            <span>◈</span>
                            Marketplace
                        </NavLink>

                        <NavLink
                            to="/transactions"
                            className="sidebar-link"
                            onClick={onNavigate}
                        >
                            <span>↔</span>
                            Transactions
                        </NavLink>
                        <NavLink to="/blockchain" className="sidebar-link" onClick={onNavigate}>
                            <span>⛓</span>
                            Blockchain Explorer
                        </NavLink>
                    </>
                )}

                {role === "VERIFIER" && (
                    <>
                        <NavLink to="/verifications" className="sidebar-link" onClick={onNavigate}>
                            <span>✓</span>
                            Verification Queue
                        </NavLink>
                        <NavLink to="/verifier/pricing" className="sidebar-link" onClick={onNavigate}>
                            <span>₹</span>
                            Credit Pricing
                        </NavLink>
                        <NavLink to="/market-analytics" className="sidebar-link" onClick={onNavigate}>
                            <span>◒</span>
                            Market Analytics
                        </NavLink>
                        <NavLink to="/blockchain" className="sidebar-link" onClick={onNavigate}>
                            <span>⛓</span>
                            Blockchain Explorer
                        </NavLink>
                    </>
                )}
                {role === "ADMIN" && (
                    <>
                        <NavLink to="/admin-dashboard" className="sidebar-link" onClick={onNavigate}><span>⚙</span>Admin Control Center</NavLink>
                        <NavLink to="/admin/reports" className="sidebar-link" onClick={onNavigate}><span>▤</span>Reports & Audit</NavLink>
                        <NavLink to="/market-analytics" className="sidebar-link" onClick={onNavigate}><span>◒</span>Market Analytics</NavLink>
                        <NavLink to="/blockchain" className="sidebar-link" onClick={onNavigate}><span>⛓</span>Blockchain Explorer</NavLink>
                    </>
                )}
            </div>

            <div className="sidebar-footer">
                <div className="sidebar-role">
                    <span>Logged in as</span>
                    <strong>{role}</strong>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;