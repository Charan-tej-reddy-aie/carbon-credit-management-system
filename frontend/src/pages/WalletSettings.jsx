import { useEffect, useState } from "react";
import api from "../services/api";

function WalletSettings() {
    const [wallet, setWallet] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const loadWallet = async () => {
            try {
                const response = await api.get("/wallet");
                setWallet(response.data.data?.wallet_address || "");
                setCompanyName(response.data.data?.company_name || "");
            } catch (err) {
                setError(err.response?.data?.message || "Failed to load wallet information");
            } finally {
                setLoading(false);
            }
        };

        loadWallet();
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage("");
        setError("");
        setSaving(true);

        try {
            const response = await api.put("/wallet", {
                wallet_address: wallet.trim()
            });
            setWallet(response.data.data.wallet_address);
            setMessage(response.data.message || "Wallet address saved successfully");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to save wallet address");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <div>
                    <p className="eyebrow">COMPANY PORTAL</p>
                    <h1>Wallet Settings</h1>
                    <p>
                        Link the company wallet used for carbon-credit marketplace and blockchain operations.
                    </p>
                </div>
            </div>

            <div className="dashboard-card" style={{ maxWidth: 760 }}>
                {loading ? (
                    <p>Loading wallet information...</p>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <p><strong>Company:</strong> {companyName || "Company"}</p>

                        <label htmlFor="wallet_address">EVM Wallet Address</label>
                        <input
                            id="wallet_address"
                            type="text"
                            value={wallet}
                            onChange={(event) => setWallet(event.target.value)}
                            placeholder="0x followed by 40 hexadecimal characters"
                            maxLength={42}
                            required
                            style={{ width: "100%", marginTop: 8, marginBottom: 16 }}
                        />

                        <p style={{ color: "#64748b", lineHeight: 1.6 }}>
                            This address is required before the company can list tokenized carbon credits for sale.
                            It is also used to track the token owner in the simulated blockchain ledger.
                        </p>

                        {error && <div className="error-message">{error}</div>}
                        {message && <div className="success-message">{message}</div>}

                        <button type="submit" disabled={saving}>
                            {saving ? "Saving..." : "Save Wallet Address"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default WalletSettings;
