import { useAuth } from "../context/AuthContext";
import SellerDashboard from "./SellerDashboard";
import VerifierDashboard from "./VerifierDashboard";

function Dashboard() {
    const { user } = useAuth();

    if (user?.role === "SELLER") {
        return <SellerDashboard />;
    }

    if (user?.role === "VERIFIER") {
        return <VerifierDashboard />;
    }

    return (
        <div>
            <h1>Dashboard</h1>
            <p>Welcome, {user?.full_name}</p>
            <p>Role: {user?.role}</p>
        </div>
    );
}

export default Dashboard;