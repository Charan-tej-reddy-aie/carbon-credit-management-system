import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import StatusBadge from "../components/StatusBadge";

function BuyerDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const response = await api.get(
                    "/marketplace/my-transactions"
                );

                setTransactions(
                    response.data.data || []
                );
            } catch (error) {
                setError(
                    error.response?.data?.message ||
                    "Failed to load buyer data"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    }, []);

    const totalCredits = transactions.reduce(
        (total, transaction) =>
            total + Number(transaction.quantity || 0),
        0
    );

    const totalInvestment = transactions.reduce(
        (total, transaction) =>
            total + Number(transaction.total_amount || 0),
        0
    );

    const completedTransactions = transactions.filter(
        (transaction) =>
            transaction.transaction_status === "COMPLETED"
    ).length;

    if (loading) {
        return (
            <LoadingSpinner
                message="Loading buyer dashboard..."
            />
        );
    }

    return (
        <div className="buyer-dashboard">

            {/* Header */}
            <div className="buyer-header">

                <div>
                    <p className="eyebrow">
                        BUYER PORTAL
                    </p>

                    <h1>
                        Buyer Dashboard
                    </h1>

                    <p className="buyer-welcome">
                        Welcome back,{" "}
                        {user?.full_name || "Buyer"}
                    </p>
                </div>

                <button
                    className="primary-button"
                    onClick={() =>
                        navigate("/marketplace")
                    }
                >
                    Browse Marketplace
                </button>

            </div>

            {/* Error */}
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Statistics */}
            <div className="buyer-stats-grid">

                <div className="buyer-stat-card">

                    <div className="buyer-stat-icon">
                        C
                    </div>

                    <div>
                        <span>
                            Credits Purchased
                        </span>

                        <strong>
                            {totalCredits}
                        </strong>
                    </div>

                </div>

                <div className="buyer-stat-card">

                    <div className="buyer-stat-icon">
                        ₹
                    </div>

                    <div>
                        <span>
                            Total Investment
                        </span>

                        <strong>
                            ₹{totalInvestment.toFixed(2)}
                        </strong>
                    </div>

                </div>

                <div className="buyer-stat-card">

                    <div className="buyer-stat-icon">
                        #
                    </div>

                    <div>
                        <span>
                            Total Transactions
                        </span>

                        <strong>
                            {transactions.length}
                        </strong>
                    </div>

                </div>

                <div className="buyer-stat-card">

                    <div className="buyer-stat-icon">
                        ✓
                    </div>

                    <div>
                        <span>
                            Completed
                        </span>

                        <strong>
                            {completedTransactions}
                        </strong>
                    </div>

                </div>

            </div>

            {/* Marketplace action */}
            <div className="buyer-marketplace-card">

                <div>

                    <p className="eyebrow">
                        CARBON MARKETPLACE
                    </p>

                    <h2>
                        Purchase Verified Carbon Credits
                    </h2>

                    <p>
                        Browse available carbon credit
                        listings and purchase credits from
                        verified projects.
                    </p>

                </div>

                <button
                    className="primary-button"
                    onClick={() =>
                        navigate("/marketplace")
                    }
                >
                    Explore Marketplace
                </button>

            </div>

            {/* Transactions */}
            <div className="buyer-transactions-section">

                <div className="section-heading">

                    <div>
                        <p className="eyebrow">
                            ACTIVITY
                        </p>

                        <h2>
                            Recent Transactions
                        </h2>
                    </div>

                    {transactions.length > 0 && (
                        <button
                            className="secondary-button"
                            onClick={() =>
                                navigate("/transactions")
                            }
                        >
                            View All
                        </button>
                    )}

                </div>

                {transactions.length === 0 ? (

                    <div className="buyer-empty-state">

                        <div className="buyer-empty-icon">
                            C
                        </div>

                        <h3>
                            No purchases yet
                        </h3>

                        <p>
                            You haven't purchased any carbon
                            credits yet.
                        </p>

                        <button
                            className="primary-button"
                            onClick={() =>
                                navigate("/marketplace")
                            }
                        >
                            Browse Carbon Credits
                        </button>

                    </div>

                ) : (

                    <div className="buyer-transactions-card">

                        <div className="transaction-table-wrapper">

                            <table className="buyer-transaction-table">

                                <thead>
                                    <tr>
                                        <th>
                                            Project
                                        </th>

                                        <th>
                                            Quantity
                                        </th>

                                        <th>
                                            Price / Credit
                                        </th>

                                        <th>
                                            Total
                                        </th>

                                        <th>
                                            Status
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {transactions
                                        .slice(0, 5)
                                        .map(
                                            (
                                                transaction
                                            ) => (
                                                <tr
                                                    key={
                                                        transaction.transaction_id
                                                    }
                                                >

                                                    <td>
                                                        <strong>
                                                            {
                                                                transaction.project_name
                                                            }
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        {
                                                            transaction.quantity
                                                        }
                                                    </td>

                                                    <td>
                                                        ₹
                                                        {Number(
                                                            transaction.price_per_credit
                                                        ).toFixed(
                                                            2
                                                        )}
                                                    </td>

                                                    <td>
                                                        <strong>
                                                            ₹
                                                            {Number(
                                                                transaction.total_amount
                                                            ).toFixed(
                                                                2
                                                            )}
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        <StatusBadge
                                                            status={
                                                                transaction.transaction_status
                                                            }
                                                        />
                                                    </td>

                                                </tr>
                                            )
                                        )}

                                </tbody>

                            </table>

                        </div>

                    </div>

                )}

            </div>

        </div>
    );
}

export default BuyerDashboard;