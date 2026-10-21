import "../carbonx-trading.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import StatusBadge from "../components/StatusBadge";

function Transactions() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const response = await api.get(
                    "/marketplace/my-transactions"
                );
                setTransactions(response.data.data || []);
            } catch (error) {
                setError(
                    error.response?.data?.message ||
                    "Failed to load transactions"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    }, []);

    const purchases = transactions.filter(
        (transaction) =>
            Number(transaction.buyer_id) === Number(user?.user_id)
    );

    const sales = transactions.filter(
        (transaction) =>
            Number(transaction.seller_id) === Number(user?.user_id)
    );

    const totalPurchased = purchases.reduce(
        (total, transaction) => total + Number(transaction.quantity || 0),
        0
    );

    const totalSold = sales.reduce(
        (total, transaction) => total + Number(transaction.quantity || 0),
        0
    );

    const totalSpent = purchases.reduce(
        (total, transaction) => total + Number(transaction.total_amount || 0),
        0
    );

    const totalRevenue = sales.reduce(
        (total, transaction) => total + Number(transaction.total_amount || 0),
        0
    );

    if (loading) {
        return <LoadingSpinner message="Loading transaction history..." />;
    }

    return (
        <div className="transactions-page">
            <div className="transactions-header">
                <div>
                    <p className="eyebrow">COMPANY PORTAL</p>
                    <h1>Transaction History</h1>
                    <p>View your carbon credit purchases and sales.</p>
                </div>

                <button
                    className="secondary-button"
                    onClick={() => navigate("/dashboard")}
                >
                    ← Dashboard
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="transaction-summary">
                <div>
                    <span>Total Transactions</span>
                    <strong>{transactions.length}</strong>
                </div>
                <div>
                    <span>Credits Purchased</span>
                    <strong>{totalPurchased}</strong>
                </div>
                <div>
                    <span>Credits Sold</span>
                    <strong>{totalSold}</strong>
                </div>
                <div>
                    <span>Total Spent</span>
                    <strong>₹{totalSpent.toFixed(2)}</strong>
                </div>
                <div>
                    <span>Total Revenue</span>
                    <strong>₹{totalRevenue.toFixed(2)}</strong>
                </div>
            </div>

            {!error && transactions.length === 0 && (
                <div className="transactions-empty">
                    <div className="transactions-empty-icon">#</div>
                    <h2>No Transactions Yet</h2>
                    <p>Your company has not made any marketplace transactions yet.</p>
                    <button
                        className="primary-button"
                        onClick={() => navigate("/marketplace")}
                    >
                        Browse Marketplace
                    </button>
                </div>
            )}

            {transactions.length > 0 && (
                <div className="transactions-card">
                    <div className="transactions-card-header">
                        <div>
                            <p className="eyebrow">MARKETPLACE ACTIVITY</p>
                            <h2>Your Transactions</h2>
                        </div>
                        <button
                            className="secondary-button"
                            onClick={() => navigate("/marketplace")}
                        >
                            Buy More Credits
                        </button>
                    </div>

                    <div className="transaction-table-wrapper">
                        <table className="transactions-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Type</th>
                                    <th>Project</th>
                                    <th>Counterparty</th>
                                    <th>Quantity</th>
                                    <th>Price / Credit</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((transaction) => {
                                    const isBuyer =
                                        Number(transaction.buyer_id) ===
                                        Number(user?.user_id);

                                    return (
                                        <tr key={transaction.transaction_id}>
                                            <td>#{transaction.transaction_id}</td>
                                            <td>{isBuyer ? "Purchased" : "Sold"}</td>
                                            <td>{transaction.project_name}</td>
                                            <td>
                                                {isBuyer
                                                    ? transaction.seller_company
                                                    : transaction.buyer_company}
                                            </td>
                                            <td>{transaction.quantity}</td>
                                            <td>
                                                ₹{Number(transaction.price_per_credit).toFixed(2)}
                                            </td>
                                            <td>
                                                ₹{Number(transaction.total_amount).toFixed(2)}
                                            </td>
                                            <td>
                                                <StatusBadge status={transaction.transaction_status} />
                                            </td>
                                            <td>
                                                {transaction.transaction_date
                                                    ? new Date(transaction.transaction_date).toLocaleDateString("en-IN")
                                                    : "-"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Transactions;
