import "../carbonx-trading.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function SellCredits() {
    const navigate = useNavigate();

    const [credits, setCredits] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [quantities, setQuantities] = useState({});

    const fetchCredits = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get(
                "/marketplace/my-sellable-credits"
            );

            setCredits(response.data.data || []);
            setSummary(response.data.summary || null);
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Failed to load your sellable credits"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCredits();
    }, []);

    const handleQuantityChange = (tokenId, value) => {
        setQuantities((previous) => ({
            ...previous,
            [tokenId]: value
        }));
    };

    const handleSell = async (credit) => {
        setError("");
        setMessage("");

        const quantity = Number(
            quantities[credit.blockchain_token_id] || 0
        );
        const maxQuantity = Number(
            credit.token_sellable_quantity || 0
        );

        if (!Number.isInteger(quantity) || quantity <= 0) {
            setError("Enter a valid whole-number quantity to sell.");
            return;
        }

        if (quantity > maxQuantity) {
            setError(
                `Quantity cannot exceed ${maxQuantity} available credits.`
            );
            return;
        }

        if (!credit.price_approval_id) {
            setError("This project does not have an active verifier-approved price.");
            return;
        }

        try {
            setSubmitting(credit.blockchain_token_id);

            const response = await api.post(
                "/marketplace/list",
                {
                    blockchain_token_id: Number(
                        credit.blockchain_token_id
                    ),
                    quantity,
                    price_approval_id: Number(
                        credit.price_approval_id
                    ),
                    expires_at: null
                }
            );

            setMessage(
                response.data.message ||
                "Credits listed successfully."
            );

            setQuantities((previous) => ({
                ...previous,
                [credit.blockchain_token_id]: ""
            }));

            await fetchCredits();
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Failed to list credits"
            );
        } finally {
            setSubmitting(null);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-page">
                <div className="page-header">
                    <p className="eyebrow">COMPANY PORTAL</p>
                    <h1>Sell Carbon Credits</h1>
                    <p>Loading your available credits...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <p className="eyebrow">COMPANY PORTAL</p>
                <h1>Sell Carbon Credits</h1>
                <p>Sell surplus carbon credits using verifier-approved prices.</p>
            </div>

            {message && <div className="success-message">{message}</div>}
            {error && <div className="error-message">{error}</div>}

            <div className="credit-alert positive-alert">
                <div>
                    <p className="eyebrow">SELLING RULE</p>
                    <h2>Verifier Approved Pricing</h2>
                    <p>
                        Selling price is taken from the active verifier-approved
                        price for each project. You cannot directly change it.
                    </p>
                </div>
            </div>

            {summary && (
                <div className="dashboard-statistics">
                    <div className="stat-card">
                        <span>Registered Credits</span>
                        <strong>{summary.registered_credits}</strong>
                    </div>
                    <div className="stat-card">
                        <span>Reported Credits</span>
                        <strong>{summary.reported_credits}</strong>
                    </div>
                    <div className="stat-card">
                        <span>Sellable Surplus</span>
                        <strong>{summary.sellable_credits}</strong>
                    </div>
                </div>
            )}

            {credits.length === 0 ? (
                <div className="empty-state">
                    <h3>No credits available for sale</h3>
                    <p>
                        You currently do not have any unlisted carbon credits
                        with an active verifier-approved price.
                    </p>
                    <button
                        className="primary-button"
                        onClick={() => navigate("/marketplace")}
                    >
                        Buy Credits
                    </button>
                </div>
            ) : (
                <div className="dashboard-section">
                    <div className="section-header">
                        <div>
                            <p className="eyebrow">AVAILABLE CREDITS</p>
                            <h2>Your Carbon Credits</h2>
                        </div>
                    </div>

                    <div className="project-list">
                        {credits.map((credit) => (
                            <div
                                className="create-project-card"
                                key={credit.blockchain_token_id}
                            >
                                <div className="form-section-header">
                                    <div>
                                        <p className="eyebrow">
                                            {credit.project_name}
                                        </p>
                                        <h2>{credit.project_name}</h2>
                                        <p>
                                            Project ID: {credit.project_id}
                                        </p>
                                    </div>
                                </div>

                                <div className="dashboard-statistics">
                                    <div className="stat-card">
                                        <span>Owned</span>
                                        <strong>{credit.quantity_owned}</strong>
                                    </div>

                                    <div className="stat-card">
                                        <span>Already Listed</span>
                                        <strong>{credit.quantity_already_listed}</strong>
                                    </div>

                                    <div className="stat-card">
                                        <span>Available to Sell</span>
                                        <strong>{credit.token_sellable_quantity}</strong>
                                    </div>

                                    <div className="stat-card">
                                        <span>Approved Price</span>
                                        <strong>
                                            ₹{Number(credit.price_per_credit).toFixed(2)}
                                        </strong>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>
                                        Quantity to Sell
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={credit.token_sellable_quantity}
                                        step="1"
                                        value={
                                            quantities[credit.blockchain_token_id] || ""
                                        }
                                        onChange={(e) =>
                                            handleQuantityChange(
                                                credit.blockchain_token_id,
                                                e.target.value
                                            )
                                        }
                                        disabled={
                                            submitting === credit.blockchain_token_id
                                        }
                                    />
                                </div>

                                <div className="form-actions">
                                    <button
                                        type="button"
                                        className="secondary-button"
                                        onClick={() => navigate("/marketplace")}
                                    >
                                        Marketplace
                                    </button>

                                    <button
                                        type="button"
                                        className="primary-button"
                                        onClick={() => handleSell(credit)}
                                        disabled={
                                            submitting === credit.blockchain_token_id
                                        }
                                    >
                                        {submitting === credit.blockchain_token_id
                                            ? "Listing..."
                                            : "Sell Credits"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="dashboard-section">
                <button
                    className="secondary-button"
                    onClick={() => navigate("/marketplace/price-request")}
                >
                    Request a Higher Price
                </button>
            </div>
        </div>
    );
}

export default SellCredits;
