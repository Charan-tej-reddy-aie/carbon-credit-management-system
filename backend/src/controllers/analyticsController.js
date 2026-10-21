const { pool } = require("../config/database");

async function getDashboardAnalytics(req, res) {
    try {
        const [summaryRows] = await pool.execute(`
                SELECT
                    (SELECT COUNT(*) FROM users) AS total_users,
                    (SELECT COUNT(*) FROM companies) AS total_companies,
                    (SELECT COUNT(*) FROM carbon_projects) AS total_projects,
                    (SELECT COUNT(*) FROM project_verifications) AS total_verifications,
                    (SELECT COUNT(*) FROM carbon_credits) AS total_credit_batches,
                    (SELECT COALESCE(SUM(quantity),0) FROM carbon_credits) AS total_credits_issued,
                    (SELECT COALESCE(SUM(quantity_owned),0) FROM company_credit_holdings) AS credits_held,
                    (SELECT COUNT(*) FROM blockchain_tokens) AS total_tokens,
                    (SELECT COUNT(*) FROM marketplace_listings WHERE status IN ('ACTIVE','PARTIALLY_SOLD')) AS active_listings,
                    (SELECT COUNT(*) FROM transactions WHERE transaction_status='SUCCESSFUL') AS successful_transactions,
                    (SELECT COALESCE(SUM(total_amount),0) FROM transactions WHERE transaction_status='SUCCESSFUL') AS transaction_value,
                    (SELECT COUNT(*) FROM credit_retirements) AS total_retirements,
                    (SELECT COALESCE(SUM(quantity),0) FROM credit_retirements) AS retired_credits
            `);
        res.json({ success: true, data: summaryRows[0] || {} });
    } catch (error) {
        console.error("Dashboard analytics error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message || "Failed to load analytics" });
    }
}

async function getMarketAnalytics(req, res) {
    try {
        const [rows] = await pool.execute(`
            SELECT market_data_id, recorded_at, average_price, demand, supply, trading_volume,
                   (demand - supply) AS demand_supply_difference
            FROM market_data
            ORDER BY recorded_at DESC
            LIMIT 100
        `);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error("Market analytics error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message || "Failed to load market analytics" });
    }
}

async function getPredictions(req, res) {
    try {
        const [rows] = await pool.execute(`
            SELECT prediction_id, generated_at, target_date, current_price, predicted_price,
                   model_name, model_version, confidence_score
            FROM price_predictions
            ORDER BY target_date DESC, prediction_id DESC
            LIMIT 100
        `);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error("Price predictions error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message || "Failed to load price predictions" });
    }
}

async function getTokenTransfers(req, res) {
    try {
        const [rows] = await pool.execute(`
            SELECT
                tt.transfer_id,
                tt.blockchain_token_id,
                bt.on_chain_token_id,
                tt.from_wallet,
                tt.to_wallet,
                tt.quantity,
                tt.transaction_hash,
                tt.block_number,
                tt.transfer_type,
                tt.transferred_at,
                cp.project_name
            FROM token_transfers tt
            JOIN blockchain_tokens bt ON bt.blockchain_token_id = tt.blockchain_token_id
            JOIN carbon_credits cc ON cc.credit_id = bt.credit_id
            JOIN project_verifications pv ON pv.verification_id = cc.verification_id
            JOIN carbon_projects cp ON cp.project_id = pv.project_id
            ORDER BY tt.transfer_id DESC
            LIMIT 100
        `);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error("Token transfers error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message || "Failed to load token transfers" });
    }
}

module.exports = { getDashboardAnalytics, getMarketAnalytics, getPredictions, getTokenTransfers };
