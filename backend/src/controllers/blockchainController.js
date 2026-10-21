const { pool } = require("../config/database");

function companyFilter(req, alias = "u") {
    if (req.user.role === "COMPANY") {
        return { sql: `AND ${alias}.user_id = ?`, params: [req.user.user_id] };
    }
    return { sql: "", params: [] };
}

async function getOverview(req, res) {
    try {
        // The previous implementation used nine prepared-statement parameters
        // in one SELECT. That was causing ER_WRONG_ARGUMENTS (1210) with the
        // current mysql2/MySQL setup. For this read-only aggregate query, use
        // validated numeric company_id literals instead of repeated placeholders.
        let tokenOwnerFilter = "";
        let marketplaceSellerFilter = "";
        let retirementCompanyFilter = "";

        if (req.user.role === "COMPANY") {
            const companyId = Number(req.user.company_id);
            if (!Number.isInteger(companyId) || companyId <= 0) {
                return res.status(401).json({
                    success: false,
                    message: "Company account is missing a valid company_id"
                });
            }

            tokenOwnerFilter = `AND c.company_id = ${companyId}`;
            marketplaceSellerFilter = `AND sc.company_id = ${companyId}`;
            retirementCompanyFilter = `AND c.company_id = ${companyId}`;
        }

        const sql = `
            SELECT
                (SELECT COUNT(*) FROM blockchain_tokens bt
                 JOIN carbon_credits cc ON cc.credit_id = bt.credit_id
                 JOIN project_verifications pv ON pv.verification_id = cc.verification_id
                 JOIN carbon_projects cp ON cp.project_id = pv.project_id
                 JOIN companies c ON c.company_id = cp.owner_company_id
                 WHERE 1=1 ${tokenOwnerFilter}) AS total_tokens,

                (SELECT COALESCE(SUM(bt.minted_quantity),0) FROM blockchain_tokens bt
                 JOIN carbon_credits cc ON cc.credit_id = bt.credit_id
                 JOIN project_verifications pv ON pv.verification_id = cc.verification_id
                 JOIN carbon_projects cp ON cp.project_id = pv.project_id
                 JOIN companies c ON c.company_id = cp.owner_company_id
                 WHERE 1=1 ${tokenOwnerFilter}) AS total_tokenized_credits,

                (SELECT COUNT(*) FROM token_transfers tt
                 JOIN blockchain_tokens bt ON bt.blockchain_token_id = tt.blockchain_token_id
                 JOIN carbon_credits cc ON cc.credit_id = bt.credit_id
                 JOIN project_verifications pv ON pv.verification_id = cc.verification_id
                 JOIN carbon_projects cp ON cp.project_id = pv.project_id
                 JOIN companies c ON c.company_id = cp.owner_company_id
                 WHERE 1=1 ${tokenOwnerFilter}) AS total_transfers,

                (SELECT COUNT(*) FROM token_transfers tt
                 JOIN blockchain_tokens bt ON bt.blockchain_token_id = tt.blockchain_token_id
                 JOIN carbon_credits cc ON cc.credit_id = bt.credit_id
                 JOIN project_verifications pv ON pv.verification_id = cc.verification_id
                 JOIN carbon_projects cp ON cp.project_id = pv.project_id
                 JOIN companies c ON c.company_id = cp.owner_company_id
                 WHERE tt.transfer_type = 'MINT' ${tokenOwnerFilter}) AS mint_events,

                (SELECT COUNT(*) FROM token_transfers tt
                 JOIN blockchain_tokens bt ON bt.blockchain_token_id = tt.blockchain_token_id
                 JOIN carbon_credits cc ON cc.credit_id = bt.credit_id
                 JOIN project_verifications pv ON pv.verification_id = cc.verification_id
                 JOIN carbon_projects cp ON cp.project_id = pv.project_id
                 JOIN companies c ON c.company_id = cp.owner_company_id
                 WHERE tt.transfer_type = 'TRANSFER' ${tokenOwnerFilter}) AS transfer_events,

                (SELECT COUNT(*) FROM transactions t
                 JOIN marketplace_listings ml ON ml.listing_id = t.listing_id
                 JOIN blockchain_tokens bt ON bt.blockchain_token_id = ml.blockchain_token_id
                 JOIN carbon_credits cc ON cc.credit_id = bt.credit_id
                 JOIN project_verifications pv ON pv.verification_id = cc.verification_id
                 JOIN carbon_projects cp ON cp.project_id = pv.project_id
                 JOIN companies sc ON sc.company_id = cp.owner_company_id
                 WHERE 1=1 ${marketplaceSellerFilter}) AS marketplace_transactions,

                (SELECT COALESCE(SUM(t.total_amount),0) FROM transactions t
                 JOIN marketplace_listings ml ON ml.listing_id = t.listing_id
                 JOIN blockchain_tokens bt ON bt.blockchain_token_id = ml.blockchain_token_id
                 JOIN carbon_credits cc ON cc.credit_id = bt.credit_id
                 JOIN project_verifications pv ON pv.verification_id = cc.verification_id
                 JOIN carbon_projects cp ON cp.project_id = pv.project_id
                 JOIN companies sc ON sc.company_id = cp.owner_company_id
                 WHERE t.transaction_status = 'SUCCESSFUL' ${marketplaceSellerFilter}) AS successful_market_value,

                (SELECT COUNT(*) FROM credit_retirements cr
                 JOIN companies c ON c.company_id = cr.company_id
                 WHERE 1=1 ${retirementCompanyFilter}) AS retirements,

                (SELECT COALESCE(SUM(cr.quantity),0) FROM credit_retirements cr
                 JOIN companies c ON c.company_id = cr.company_id
                 WHERE 1=1 ${retirementCompanyFilter}) AS retired_credits
        `;

        const [rows] = await pool.query(sql);
        res.json({ success: true, data: rows[0] || {} });
    } catch (error) {
        console.error("Blockchain overview error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message });
    }
}

async function getTokens(req, res) {
    try {
        const filter = companyFilter(req, "u");
        const [rows] = await pool.execute(`
            SELECT bt.blockchain_token_id, bt.credit_id, bt.on_chain_token_id,
                   bt.contract_address, bt.blockchain_network, bt.mint_transaction_hash,
                   bt.initial_owner_wallet, bt.minted_quantity, bt.status AS token_status,
                   cc.quantity AS credit_quantity, cc.vintage_year, cc.issue_date,
                   cp.project_id, cp.project_name, c.company_name, u.full_name AS owner_name
            FROM blockchain_tokens bt
            JOIN carbon_credits cc ON cc.credit_id = bt.credit_id
            JOIN project_verifications pv ON pv.verification_id = cc.verification_id
            JOIN carbon_projects cp ON cp.project_id = pv.project_id
            JOIN companies c ON c.company_id = cp.owner_company_id
            JOIN users u ON u.user_id = c.user_id
            WHERE 1=1 ${filter.sql}
            ORDER BY bt.blockchain_token_id DESC
        `, filter.params);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error("Blockchain tokens error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message });
    }
}

async function getTransfers(req, res) {
    try {
        const filter = companyFilter(req, "u");
        const [rows] = await pool.execute(`
            SELECT tt.transfer_id, tt.blockchain_token_id, bt.on_chain_token_id,
                   bt.contract_address, bt.blockchain_network, tt.from_wallet, tt.to_wallet,
                   tt.quantity, tt.transaction_hash, tt.block_number, tt.transfer_type,
                   tt.transferred_at, cp.project_name, c.company_name
            FROM token_transfers tt
            JOIN blockchain_tokens bt ON bt.blockchain_token_id = tt.blockchain_token_id
            JOIN carbon_credits cc ON cc.credit_id = bt.credit_id
            JOIN project_verifications pv ON pv.verification_id = cc.verification_id
            JOIN carbon_projects cp ON cp.project_id = pv.project_id
            JOIN companies c ON c.company_id = cp.owner_company_id
            JOIN users u ON u.user_id = c.user_id
            WHERE 1=1 ${filter.sql}
            ORDER BY tt.transfer_id DESC
            LIMIT 200
        `, filter.params);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error("Blockchain transfers error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message });
    }
}

async function getTransactions(req, res) {
    try {
        let sql = `
            SELECT t.transaction_id, t.listing_id, t.buyer_company_id,
                   bc.company_name AS buyer_company,
                   ml.seller_company_id,
                   sc.company_name AS seller_company,
                   t.quantity, t.price_per_credit, t.total_amount,
                   t.blockchain_tx_hash, t.transaction_status, t.transaction_date,
                   bt.blockchain_token_id, bt.on_chain_token_id,
                   bt.contract_address, bt.blockchain_network, cp.project_name
            FROM transactions t
            JOIN marketplace_listings ml ON ml.listing_id = t.listing_id
            JOIN companies bc ON bc.company_id = t.buyer_company_id
            JOIN companies sc ON sc.company_id = ml.seller_company_id
            JOIN blockchain_tokens bt ON bt.blockchain_token_id = ml.blockchain_token_id
            JOIN carbon_credits cc ON cc.credit_id = bt.credit_id
            JOIN project_verifications pv ON pv.verification_id = cc.verification_id
            JOIN carbon_projects cp ON cp.project_id = pv.project_id
        `;
        const params = [];
        if (req.user.role === "COMPANY") {
            sql += ` WHERE (bc.user_id = ? OR sc.user_id = ?)`;
            params.push(req.user.user_id, req.user.user_id);
        }
        sql += ` ORDER BY t.transaction_id DESC LIMIT 200`;
        const [rows] = await pool.execute(sql, params);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error("Blockchain marketplace transactions error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message });
    }
}

async function getRetirements(req, res) {
    try {
        const filter = companyFilter(req, "u");
        const [rows] = await pool.execute(`
            SELECT cr.retirement_id, cr.company_id, c.company_name, cr.blockchain_token_id,
                   bt.on_chain_token_id, bt.contract_address, bt.blockchain_network,
                   cr.quantity, cr.reason, cr.beneficiary, cr.blockchain_tx_hash,
                   cr.retired_at, cp.project_name
            FROM credit_retirements cr
            JOIN companies c ON c.company_id = cr.company_id
            JOIN users u ON u.user_id = c.user_id
            JOIN blockchain_tokens bt ON bt.blockchain_token_id = cr.blockchain_token_id
            JOIN carbon_credits cc ON cc.credit_id = bt.credit_id
            JOIN project_verifications pv ON pv.verification_id = cc.verification_id
            JOIN carbon_projects cp ON cp.project_id = pv.project_id
            WHERE 1=1 ${filter.sql}
            ORDER BY cr.retirement_id DESC
            LIMIT 200
        `, filter.params);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error("Blockchain retirements error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message });
    }
}

async function getTokenDetails(req, res) {
    try {
        const tokenId = Number(req.params.id);
        if (!Number.isInteger(tokenId) || tokenId <= 0) {
            return res.status(400).json({ success: false, message: "Invalid blockchain token ID" });
        }
        const filter = companyFilter(req, "u");
        const [tokens] = await pool.execute(`
            SELECT bt.*, cc.quantity AS credit_quantity, cc.vintage_year, cc.issue_date,
                   cp.project_id, cp.project_name, cp.location, c.company_name
            FROM blockchain_tokens bt
            JOIN carbon_credits cc ON cc.credit_id = bt.credit_id
            JOIN project_verifications pv ON pv.verification_id = cc.verification_id
            JOIN carbon_projects cp ON cp.project_id = pv.project_id
            JOIN companies c ON c.company_id = cp.owner_company_id
            JOIN users u ON u.user_id = c.user_id
            WHERE bt.blockchain_token_id = ? ${filter.sql}
            LIMIT 1
        `, [tokenId, ...filter.params]);
        if (!tokens.length) return res.status(404).json({ success: false, message: "Token not found" });

        const [transfers] = await pool.execute(`
            SELECT transfer_id, from_wallet, to_wallet, quantity, transaction_hash,
                   block_number, transfer_type, transferred_at
            FROM token_transfers
            WHERE blockchain_token_id = ?
            ORDER BY transfer_id ASC
        `, [tokenId]);

        const [transactions] = await pool.execute(`
            SELECT t.transaction_id, t.listing_id, t.quantity, t.price_per_credit,
                   t.total_amount, t.blockchain_tx_hash, t.transaction_status,
                   t.transaction_date, bc.company_name AS buyer_company,
                   sc.company_name AS seller_company
            FROM transactions t
            JOIN marketplace_listings ml ON ml.listing_id = t.listing_id
            JOIN companies bc ON bc.company_id = t.buyer_company_id
            JOIN companies sc ON sc.company_id = ml.seller_company_id
            WHERE ml.blockchain_token_id = ?
            ORDER BY t.transaction_id ASC
        `, [tokenId]);

        const [retirements] = await pool.execute(`
            SELECT retirement_id, quantity, reason, beneficiary, blockchain_tx_hash, retired_at
            FROM credit_retirements
            WHERE blockchain_token_id = ?
            ORDER BY retirement_id ASC
        `, [tokenId]);
        res.json({ success: true, data: { token: tokens[0], transfers, transactions, retirements } });
    } catch (error) {
        console.error("Blockchain token detail error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message });
    }
}

module.exports = { getOverview, getTokens, getTransfers, getTransactions, getRetirements, getTokenDetails };
