import "../carbonx-trading.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function CompanyCredits() {
    const [credits, setCredits] = useState([]); const [error, setError] = useState(""); const navigate = useNavigate();
    const load = async () => { try { const r = await api.get("/credits/my"); setCredits(r.data.data || []); } catch(e) { setError(e.response?.data?.message || "Failed to load credits"); } };
    useEffect(() => { load(); }, []);
    return <div className="dashboard-page"><div className="page-header"><div><p className="eyebrow">COMPANY PORTAL</p><h1>My Carbon Credits</h1><p>Track issued, tokenized and tradable credits.</p></div><button className="secondary-button" onClick={load}>Refresh</button></div>
        {error && <div className="error-message">{error}</div>}
        <div className="dashboard-statistics"><div className="stat-card"><span>Credit Batches</span><strong>{credits.length}</strong></div><div className="stat-card"><span>Total Owned</span><strong>{credits.reduce((s,c)=>s+Number(c.quantity_owned||0),0)}</strong></div><div className="stat-card"><span>Tokenized</span><strong>{credits.filter(c=>c.tokenized).length}</strong></div></div>
        {credits.length===0 ? <div className="empty-state"><h3>No carbon credits yet</h3><p>Credits will appear here after verification and issuance.</p></div> : credits.map(c=><div className="create-project-card" key={c.credit_id}><h2>{c.project_name}</h2><p>{c.project_type} · Vintage {c.vintage_year}</p><div className="dashboard-statistics"><div className="stat-card"><span>Owned</span><strong>{c.quantity_owned}</strong></div><div className="stat-card"><span>Listed</span><strong>{c.listed_quantity}</strong></div><div className="stat-card"><span>Available</span><strong>{c.available_to_sell}</strong></div><div className="stat-card"><span>Price</span><strong>{c.price_per_credit ? `₹${Number(c.price_per_credit).toFixed(2)}` : "Pending"}</strong></div></div><p>{c.tokenized ? `Token #${c.on_chain_token_id} on ${c.blockchain_network}` : "Not tokenized yet"}</p><div className="form-actions"><button className="primary-button" onClick={()=>navigate("/marketplace/sell")}>Sell</button><button className="secondary-button" disabled={!c.tokenized || c.available_to_sell<=0} onClick={()=>navigate("/credits/retire")}>Retire</button></div></div>)}
    </div>;
}
export default CompanyCredits;
