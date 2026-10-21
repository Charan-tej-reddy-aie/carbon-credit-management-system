import "../carbonx-intelligence.css";
import { useEffect, useState } from "react";
import api from "../services/api";

function BlockchainExplorer() {
    const [overview, setOverview] = useState({});
    const [tokens, setTokens] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [retirements, setRetirements] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const [o, t, tr, tx, r] = await Promise.all([
                api.get("/blockchain/overview"),
                api.get("/blockchain/tokens"),
                api.get("/blockchain/transfers"),
                api.get("/blockchain/transactions"),
                api.get("/blockchain/retirements")
            ]);
            setOverview(o.data.data || {});
            setTokens(t.data.data || []);
            setTransfers(tr.data.data || []);
            setTransactions(tx.data.data || []);
            setRetirements(r.data.data || []);
        } catch (error) {
            console.error("Blockchain explorer load error", error);
            alert(error.response?.data?.message || "Failed to load blockchain data");
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const inspect = async (id) => {
        try {
            const response = await api.get(`/blockchain/tokens/${id}`);
            setSelected(response.data.data);
        } catch (error) {
            alert(error.response?.data?.message || "Failed to load token details");
        }
    };

    const short = (value, n = 18) => value ? `${String(value).slice(0, n)}…` : "—";
    const money = Number(overview.successful_market_value || 0).toLocaleString();

    return (
        <div className="cx-blockchain-page page-container">
            <div className="page-header cx-chain-hero">
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                        <h1 style={{ margin: 0 }}>Blockchain Explorer</h1>
                        <span style={{ fontSize: "12px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "2px 10px", borderRadius: "999px", fontWeight: "600" }}>
                            On-Chain Ledger Simulation
                        </span>
                    </div>
                    <p>Track tokenization, transfers, marketplace transactions and credit retirements recorded in the audited relational database ledger.</p>
                </div>
                <button onClick={load}>Refresh</button>
            </div>

            {loading ? <p>Loading blockchain records...</p> : (
                <>
                    <div className="dashboard-grid cx-chain-metrics">
                        <div className="stat-card"><span>Total Tokens</span><strong>{overview.total_tokens || 0}</strong></div>
                        <div className="stat-card"><span>Tokenized Credits</span><strong>{overview.total_tokenized_credits || 0}</strong></div>
                        <div className="stat-card"><span>Transfers</span><strong>{overview.total_transfers || 0}</strong></div>
                        <div className="stat-card"><span>Marketplace Txns</span><strong>{overview.marketplace_transactions || 0}</strong></div>
                        <div className="stat-card"><span>Market Value</span><strong>₹ {money}</strong></div>
                        <div className="stat-card"><span>Retired Credits</span><strong>{overview.retired_credits || 0}</strong></div>
                    </div>

                    <section className="card cx-chain-panel">
                        <h2>Token Registry</h2>
                        <div className="table-container"><table><thead><tr>
                            <th>Token</th><th>Project</th><th>Network</th><th>Quantity</th><th>Status</th><th>Mint Tx</th><th></th>
                        </tr></thead><tbody>
                            {tokens.map(t => <tr key={t.blockchain_token_id}>
                                <td>#{t.on_chain_token_id}</td><td>{t.project_name}</td><td>{t.blockchain_network}</td>
                                <td>{t.minted_quantity}</td><td>{t.token_status}</td><td title={t.mint_transaction_hash}>{short(t.mint_transaction_hash)}</td>
                                <td><button onClick={() => inspect(t.blockchain_token_id)}>Inspect</button></td>
                            </tr>)}
                            {!tokens.length && <tr><td colSpan="7">No blockchain tokens found.</td></tr>}
                        </tbody></table></div>
                    </section>

                    <section className="card cx-chain-panel">
                        <h2>Token Transfer Ledger</h2>
                        <div className="table-container"><table><thead><tr>
                            <th>Token</th><th>Type</th><th>From</th><th>To</th><th>Qty</th><th>Tx Hash</th><th>Block</th>
                        </tr></thead><tbody>
                            {transfers.map(t => <tr key={t.transfer_id}>
                                <td>#{t.on_chain_token_id}</td><td>{t.transfer_type}</td><td title={t.from_wallet}>{short(t.from_wallet)}</td>
                                <td title={t.to_wallet}>{short(t.to_wallet)}</td><td>{t.quantity}</td><td title={t.transaction_hash}>{short(t.transaction_hash)}</td><td>{t.block_number || "—"}</td>
                            </tr>)}
                            {!transfers.length && <tr><td colSpan="7">No transfers found.</td></tr>}
                        </tbody></table></div>
                    </section>

                    <section className="card cx-chain-panel">
                        <h2>Marketplace Blockchain Transactions</h2>
                        <div className="table-container"><table><thead><tr>
                            <th>ID</th><th>Project</th><th>Buyer</th><th>Seller</th><th>Qty</th><th>Value</th><th>Status</th><th>Tx Hash</th>
                        </tr></thead><tbody>
                            {transactions.map(t => <tr key={t.transaction_id}>
                                <td>#{t.transaction_id}</td><td>{t.project_name}</td><td>{t.buyer_company}</td><td>{t.seller_company}</td>
                                <td>{t.quantity}</td><td>₹ {Number(t.total_amount || 0).toLocaleString()}</td><td>{t.transaction_status}</td><td title={t.blockchain_tx_hash}>{short(t.blockchain_tx_hash)}</td>
                            </tr>)}
                            {!transactions.length && <tr><td colSpan="8">No marketplace transactions found.</td></tr>}
                        </tbody></table></div>
                    </section>

                    <section className="card cx-chain-panel">
                        <h2>Retirement Ledger</h2>
                        <div className="table-container"><table><thead><tr>
                            <th>Project</th><th>Token</th><th>Quantity</th><th>Reason</th><th>Beneficiary</th><th>Tx Hash</th><th>Date</th>
                        </tr></thead><tbody>
                            {retirements.map(r => <tr key={r.retirement_id}>
                                <td>{r.project_name}</td><td>#{r.on_chain_token_id}</td><td>{r.quantity}</td><td>{r.reason}</td>
                                <td>{r.beneficiary || "—"}</td><td title={r.blockchain_tx_hash}>{short(r.blockchain_tx_hash)}</td><td>{r.retired_at ? new Date(r.retired_at).toLocaleString() : "—"}</td>
                            </tr>)}
                            {!retirements.length && <tr><td colSpan="7">No retirements found.</td></tr>}
                        </tbody></table></div>
                    </section>
                </>
            )}

            {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}>
                <div className="modal" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setSelected(null)}>Close</button>
                    <h2>Token #{selected.token.on_chain_token_id}</h2>
                    <p><strong>Project:</strong> {selected.token.project_name}</p>
                    <p><strong>Network:</strong> {selected.token.blockchain_network}</p>
                    <p><strong>Contract:</strong> {selected.token.contract_address}</p>
                    <p><strong>Mint transaction:</strong> {selected.token.mint_transaction_hash}</p>
                    <p><strong>Quantity:</strong> {selected.token.minted_quantity}</p>
                    <h3>Lifecycle</h3>
                    <ol>
                        {selected.transfers.map(t => <li key={`t-${t.transfer_id}`}>{t.transfer_type}: {t.quantity} credits — {t.transaction_hash}</li>)}
                        {selected.transactions.map(t => <li key={`x-${t.transaction_id}`}>Marketplace: {t.quantity} credits — {t.blockchain_tx_hash || "database-recorded"}</li>)}
                        {selected.retirements.map(r => <li key={`r-${r.retirement_id}`}>Retired: {r.quantity} credits — {r.blockchain_tx_hash || "database-recorded"}</li>)}
                    </ol>
                </div>
            </div>}
        </div>
    );
}
export default BlockchainExplorer;
