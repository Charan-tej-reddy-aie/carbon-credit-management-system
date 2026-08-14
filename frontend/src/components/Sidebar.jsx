import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Sidebar() {
    const { user } = useAuth();

    const role = user?.role;

    return (
        <aside className="sidebar">
            <div className="sidebar-section">
                <p className="sidebar-heading">
                    MAIN MENU
                </p>

                <NavLink
                    to={
                        role === "SELLER"
                            ? "/dashboard"
                            : role === "VERIFIER"
                            ? "/verifier-dashboard"
                            : "/buyer-dashboard"
                    }
                    className="sidebar-link"
                >
                    <span>⌂</span>
                    Dashboard
                </NavLink>

                {role === "SELLER" && (
                    <>
                        <NavLink
                            to="/projects"
                            className="sidebar-link"
                        >
                            <span>▣</span>
                            My Projects
                        </NavLink>

                        <NavLink
                            to="/projects/create"
                            className="sidebar-link"
                        >
                            <span>＋</span>
                            Create Project
                        </NavLink>

                        <NavLink
                            to="/transactions"
                            className="sidebar-link"
                        >
                            <span>↔</span>
                            Transactions
                        </NavLink>
                    </>
                )}

                {role === "VERIFIER" && (
                    <NavLink
                        to="/verifications"
                        className="sidebar-link"
                    >
                        <span>✓</span>
                        Verification Queue
                    </NavLink>
                )}

                {role === "BUYER" && (
                    <>
                        <NavLink
                            to="/marketplace"
                            className="sidebar-link"
                        >
                            <span>◈</span>
                            Marketplace
                        </NavLink>

                        <NavLink
                            to="/transactions"
                            className="sidebar-link"
                        >
                            <span>↔</span>
                            Transactions
                        </NavLink>
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