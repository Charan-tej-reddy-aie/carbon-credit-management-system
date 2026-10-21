import "../carbonx-trading.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import StatusBadge from "../components/StatusBadge";

function Marketplace() {
    const navigate = useNavigate();

    const [listings, setListings] = useState([]);
    const [quantities, setQuantities] = useState({});
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const fetchListings = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/marketplace");

            setListings(response.data.data || []);
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Failed to load marketplace"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchListings();
    }, []);

    const handleQuantityChange = (listingId, value) => {
        setQuantities((previous) => ({
            ...previous,
            [listingId]: value
        }));
    };

    const handlePurchase = async (listing) => {
        setMessage("");
        setError("");

        const quantity = Number(
            quantities[listing.listing_id] || 0
        );

        if (quantity <= 0) {
            setError(
                "Enter a valid purchase quantity."
            );
            return;
        }

        if (
            quantity >
            Number(listing.quantity_available)
        ) {
            setError(
                "Purchase quantity cannot exceed available credits."
            );
            return;
        }

        const totalAmount =
            quantity *
            Number(listing.price_per_credit);

        const confirmed = window.confirm(
            `Purchase ${quantity} carbon credits for ₹${totalAmount.toFixed(
                2
            )}?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setPurchasing(listing.listing_id);

            const response = await api.post(
                "/marketplace/purchase",
                {
                    listing_id: listing.listing_id,
                    quantity,
                    blockchain_tx_hash: null
                }
            );

            setMessage(
                response.data.message ||
                "Carbon credits purchased successfully."
            );

            setQuantities((previous) => ({
                ...previous,
                [listing.listing_id]: ""
            }));

            await fetchListings();

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Purchase failed"
            );
        } finally {
            setPurchasing(null);
        }
    };

    if (loading) {
        return (
            <LoadingSpinner
                message="Loading carbon marketplace..."
            />
        );
    }

    return (
        <div className="marketplace-page">

            {/* Header */}
            <div className="marketplace-header">

                <div>
                    <p className="eyebrow">
                        CARBON MARKETPLACE
                    </p>

                    <h1>
                        Carbon Credit Marketplace
                    </h1>

                    <p>
                        Browse verified carbon credits and
                        purchase them directly from registered
                        sellers.
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

            {/* Success */}
            {message && (
                <div className="success-message">
                    {message}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Marketplace summary */}
            <div className="marketplace-summary">

                <div>
                    <span>
                        Available Listings
                    </span>

                    <strong>
                        {listings.length}
                    </strong>
                </div>

                <div>
                    <span>
                        Total Credits Available
                    </span>

                    <strong>
                        {listings.reduce(
                            (total, listing) =>
                                total +
                                Number(
                                    listing.quantity_available || 0
                                ),
                            0
                        )}
                    </strong>
                </div>

            </div>

            {/* Empty */}
            {listings.length === 0 ? (

                <div className="marketplace-empty">

                    <div className="marketplace-empty-icon">
                        C
                    </div>

                    <h2>
                        No Carbon Credits Available
                    </h2>

                    <p>
                        No carbon credits are currently
                        available in the marketplace.
                    </p>

                    <button
                        className="secondary-button"
                        onClick={fetchListings}
                    >
                        Refresh Marketplace
                    </button>

                </div>

            ) : (

                <div className="marketplace-grid">

                    {listings.map((listing) => {

                        const quantity = Number(
                            quantities[
                                listing.listing_id
                            ] || 0
                        );

                        const totalAmount =
                            quantity *
                            Number(
                                listing.price_per_credit
                            );

                        return (
                            <div
                                className="marketplace-card"
                                key={listing.listing_id}
                            >

                                {/* Card header */}
                                <div className="marketplace-card-header">

                                    <div>

                                        <p className="listing-label">
                                            VERIFIED PROJECT
                                        </p>

                                        <h2>
                                            {listing.project_name}
                                        </h2>

                                    </div>

                                    <StatusBadge
                                        status={
                                            listing.status
                                        }
                                    />

                                </div>

                                {/* Project information */}
                                <div className="listing-details">

                                    <div>
                                        <span>
                                            Project Type
                                        </span>

                                        <strong>
                                            {
                                                listing.project_type
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Location
                                        </span>

                                        <strong>
                                            {listing.location}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Seller
                                        </span>

                                        <strong>
                                            {listing.seller_name}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Company
                                        </span>

                                        <strong>
                                            {
                                                listing.seller_company
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Vintage Year
                                        </span>

                                        <strong>
                                            {
                                                listing.vintage_year
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Available Credits
                                        </span>

                                        <strong>
                                            {
                                                listing.quantity_available
                                            }
                                        </strong>
                                    </div>

                                </div>

                                {/* Price */}
                                <div className="listing-price">

                                    <span>
                                        Price per Carbon Credit
                                    </span>

                                    <strong>
                                        ₹
                                        {Number(
                                            listing.price_per_credit
                                        ).toFixed(2)}
                                    </strong>

                                </div>

                                {/* Purchase */}
                                <div className="purchase-section">

                                    <label>
                                        Quantity to purchase
                                    </label>

                                    <div className="purchase-controls">

                                        <input
                                            type="number"
                                            min="1"
                                            max={
                                                listing.quantity_available
                                            }
                                            value={
                                                quantities[
                                                    listing.listing_id
                                                ] || ""
                                            }
                                            onChange={(e) =>
                                                handleQuantityChange(
                                                    listing.listing_id,
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Quantity"
                                        />

                                        <button
                                            className="primary-button"
                                            onClick={() =>
                                                handlePurchase(
                                                    listing
                                                )
                                            }
                                            disabled={
                                                purchasing ===
                                                listing.listing_id
                                            }
                                        >
                                            {purchasing ===
                                            listing.listing_id
                                                ? "Purchasing..."
                                                : "Purchase Credits"}
                                        </button>

                                    </div>

                                    {quantity > 0 && (
                                        <div className="purchase-total">
                                            Total:
                                            <strong>
                                                ₹
                                                {totalAmount.toFixed(
                                                    2
                                                )}
                                            </strong>
                                        </div>
                                    )}

                                </div>

                            </div>
                        );
                    })}

                </div>
            )}

        </div>
    );
}

export default Marketplace;