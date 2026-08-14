import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import StatusBadge from "../components/StatusBadge";

function Transactions() {
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
                    "Failed to load transactions"
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

    const totalAmount = transactions.reduce(
        (total, transaction) =>
            total + Number(transaction.total_amount || 0),
        0
    );

    if (loading) {
        return (
            <LoadingSpinner
                message="Loading transaction history..."
            />
        );
    }

    return (
        <div className="transactions-page">

            {/* Header */}
            <div className="transactions-header">

                <div>
                    <p className="eyebrow">
                        BUYER PORTAL
                    </p>

                    <h1>
                        Transaction History
                    </h1>

                    <p>
                        View all your carbon credit purchases
                        and transaction details.
                    </p>
                </div>

                <button
                    className="secondary-button"
                    onClick={() =>
                        navigate("/dashboard")
                    }
                >
                    ← Dashboard
                </button>

            </div>

            {/* Error */}
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Summary */}
            <div className="transaction-summary">

                <div>
                    <span>
                        Total Transactions
                    </span>

                    <strong>
                        {transactions.length}
                    </strong>
                </div>

                <div>
                    <span>
                        Credits Purchased
                    </span>

                    <strong>
                        {totalCredits}
                    </strong>
                </div>

                <div>
                    <span>
                        Total Investment
                    </span>

                    <strong>
                        ₹{totalAmount.toFixed(2)}
                    </strong>
                </div>

            </div>

            {/* Empty state */}
            {!error && transactions.length === 0 && (

                <div className="transactions-empty">

                    <div className="transactions-empty-icon">
                        #
                    </div>

                    <h2>
                        No Transactions Yet
                    </h2>

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
                        Browse Marketplace
                    </button>

                </div>

            )}

            {/* Transactions */}
            {transactions.length > 0 && (

                <div className="transactions-card">

                    <div className="transactions-card-header">

                        <div>
                            <p className="eyebrow">
                                PURCHASE RECORDS
                            </p>

                            <h2>
                                Your Transactions
                            </h2>
                        </div>

                        <button
                            className="secondary-button"
                            onClick={() =>
                                navigate("/marketplace")
                            }
                        >
                            Buy More Credits
                        </button>

                    </div>

                    <div className="transaction-table-wrapper">

                        <table className="transactions-table">

                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Project</th>
                                    <th>Seller</th>
                                    <th>Quantity</th>
                                    <th>Price / Credit</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>

                            <tbody>

                                {transactions.map(
                                    (transaction) => (
                                        <tr
                                            key={
                                                transaction.transaction_id
                                            }
                                        >

                                            <td>
                                                <strong>
                                                    #
                                                    {
                                                        transaction.transaction_id
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                <strong>
                                                    {
                                                        transaction.project_name
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                {
                                                    transaction.seller_name
                                                }
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
                                                ).toFixed(2)}
                                            </td>

                                            <td>
                                                <strong>
                                                    ₹
                                                    {Number(
                                                        transaction.total_amount
                                                    ).toFixed(2)}
                                                </strong>
                                            </td>

                                            <td>
                                                <StatusBadge
                                                    status={
                                                        transaction.transaction_status
                                                    }
                                                />
                                            </td>

                                            <td>
                                                {transaction.transaction_date
                                                    ? new Date(
                                                          transaction.transaction_date
                                                      ).toLocaleDateString(
                                                          "en-IN"
                                                      )
                                                    : "-"}
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
    );
}

export default Transactions;