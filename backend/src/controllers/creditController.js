const { pool } = require("../config/database");

function unwrapCall(result) {
    return result?.[0]?.[0] || null;
}

async function getIssuanceQueue(req, res) {
    try {
        const [rows] = await pool.execute(`
            SELECT
                cp.project_id,
                cp.project_name,
                cp.status,
                cp.estimated_co2_reduction,
                cp.start_date,
                cp.end_date,
                c.company_id,
                c.company_name,
                u.full_name AS owner_name,
                pv.verification_id,
                pv.verified_co2_reduction,
                pv.verified_at
            FROM carbon_projects cp
            JOIN companies c ON c.company_id = cp.owner_company_id
            JOIN users u ON u.user_id = c.user_id
            JOIN project_verifications pv
              ON pv.project_id = cp.project_id
             AND pv.verification_stage = 'START_APPROVAL'
             AND pv.status = 'APPROVED'
            LEFT JOIN carbon_credits cc ON cc.verification_id = pv.verification_id
            WHERE cp.status IN ('IN_PROGRESS','COMPLETED')
              AND cc.credit_id IS NULL
            ORDER BY cp.project_id DESC
        `);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error("Credit issuance queue error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message || "Failed to load credit issuance queue" });
    }
}

async function issueCredits(req, res) {
    try {
        const { project_id, verification_id, quantity, vintage_year } = req.body;
        const projectId = Number(project_id);
        const verificationId = Number(verification_id);
        const qty = Number(quantity);
        const year = Number(vintage_year);

        if (!Number.isInteger(projectId) || !Number.isInteger(verificationId) || !Number.isInteger(qty) || !Number.isInteger(year)) {
            return res.status(400).json({ success: false, message: "Project, verification, quantity and vintage year must be valid integers" });
        }
        if (qty <= 0) return res.status(400).json({ success: false, message: "Credit quantity must be greater than zero" });
        if (year < 2000 || year > 2100) return res.status(400).json({ success: false, message: "Invalid vintage year" });

        const [result] = await pool.query(`CALL sp_issue_credits(?, ?, ?, ?)`, [projectId, verificationId, qty, year]);
        const row = unwrapCall(result);

        res.status(201).json({
            success: true,
            message: "Carbon credits issued successfully",
            data: { project_id: projectId, verification_id: verificationId, credit_id: row?.credit_id || null, quantity: qty, vintage_year: year }
        });
    } catch (error) {
        console.error("Issue credits error:", error);
        res.status(400).json({ success: false, message: error.sqlMessage || error.message || "Failed to issue credits" });
    }
}

async function getMyCredits(req, res) {
    try {
        const [rows] = await pool.execute(`
            SELECT
                c.company_id,
                c.company_name,
                cc.credit_id,
                cc.quantity,
                cc.vintage_year,
                cc.issue_date,
                cc.status AS credit_status,
                cp.project_id,
                cp.project_name,
                pt.type_name AS project_type,
                bt.blockchain_token_id,
                bt.on_chain_token_id,
                bt.contract_address,
                bt.blockchain_network,
                bt.status AS token_status,
                h.quantity_owned,
                COALESCE((
                    SELECT SUM(ml.quantity_available)
                    FROM marketplace_listings ml
                    WHERE ml.seller_company_id = c.company_id
                      AND ml.blockchain_token_id = bt.blockchain_token_id
                      AND ml.status IN ('ACTIVE','PARTIALLY_SOLD')
                ), 0) AS listed_quantity,
                cpa.price_approval_id,
                cpa.price_per_credit,
                cpa.status AS price_status
            FROM companies c
            JOIN company_credit_holdings h ON h.company_id = c.company_id
            JOIN carbon_credits cc ON cc.credit_id = h.credit_id
            JOIN project_verifications pv ON pv.verification_id = cc.verification_id
            JOIN carbon_projects cp ON cp.project_id = pv.project_id
            JOIN project_types pt ON pt.project_type_id = cp.project_type_id
            LEFT JOIN blockchain_tokens bt ON bt.credit_id = cc.credit_id
            LEFT JOIN credit_price_approvals cpa
              ON cpa.project_id = cp.project_id AND cpa.status = 'ACTIVE'
            WHERE c.user_id = ?
            ORDER BY cc.credit_id DESC
        `, [req.user.user_id]);

        const data = rows.map(r => ({
            ...r,
            available_to_sell: Math.max(Number(r.quantity_owned || 0) - Number(r.listed_quantity || 0), 0),
            tokenized: Boolean(r.blockchain_token_id),
            price_approved: Boolean(r.price_approval_id)
        }));

        res.json({ success: true, count: data.length, data });
    } catch (error) {
        console.error("My credits error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message || "Failed to retrieve credits" });
    }
}

async function getTokenizationQueue(req, res) {
    try {
        const [rows] = await pool.execute(`
            SELECT
                cc.credit_id,
                cc.quantity,
                cc.vintage_year,
                cc.issue_date,
                cc.status AS credit_status,
                cp.project_id,
                cp.project_name,
                c.company_id,
                c.company_name,
                u.wallet_address
            FROM carbon_credits cc
            JOIN project_verifications pv ON pv.verification_id = cc.verification_id
            JOIN carbon_projects cp ON cp.project_id = pv.project_id
            JOIN companies c ON c.company_id = cp.owner_company_id
            JOIN users u ON u.user_id = c.user_id
            LEFT JOIN blockchain_tokens bt ON bt.credit_id = cc.credit_id
            WHERE bt.blockchain_token_id IS NULL
              AND cc.status IN ('ISSUED','TOKENIZED')
            ORDER BY cc.credit_id DESC
        `);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error("Tokenization queue error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message || "Failed to load tokenization queue" });
    }
}

async function tokenizeCredit(req, res) {
    let connection;
    let transactionStarted = false;
    try {
        const {
            credit_id,
            on_chain_token_id,
            contract_address,
            blockchain_network,
            mint_transaction_hash,
            initial_owner_wallet
        } = req.body || {};

        const creditId = Number(credit_id);
        const tokenId = Number(on_chain_token_id);
        const contract = String(contract_address || "").trim();
        const network = String(blockchain_network || "").trim();
        const mintHash = String(mint_transaction_hash || "").trim();

        if (!Number.isSafeInteger(creditId) || creditId <= 0 || !Number.isSafeInteger(tokenId) || tokenId < 0) {
            return res.status(400).json({ success: false, message: "Enter a valid credit ID and non-negative on-chain token ID." });
        }
        if (!contract || contract.length > 42) {
            return res.status(400).json({ success: false, message: "Contract address is required and must be 42 characters or fewer." });
        }
        if (!network || network.length > 100) {
            return res.status(400).json({ success: false, message: "Blockchain network is required and must be 100 characters or fewer." });
        }
        if (!mintHash || mintHash.length > 66) {
            return res.status(400).json({ success: false, message: "Mint transaction hash is required and must be 66 characters or fewer." });
        }
        if (initial_owner_wallet != null && String(initial_owner_wallet).trim().length > 42) {
            return res.status(400).json({ success: false, message: "Owner wallet must be 42 characters or fewer." });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        const [credits] = await connection.execute(`
            SELECT cc.credit_id, cc.quantity, cc.status, u.wallet_address
            FROM carbon_credits cc
            JOIN project_verifications pv ON pv.verification_id = cc.verification_id
            JOIN carbon_projects cp ON cp.project_id = pv.project_id
            JOIN companies c ON c.company_id = cp.owner_company_id
            JOIN users u ON u.user_id = c.user_id
            WHERE cc.credit_id = ?
            FOR UPDATE
        `, [creditId]);

        if (!credits.length) throw new Error("Carbon credit does not exist.");

        const [existing] = await connection.execute(
            `SELECT blockchain_token_id FROM blockchain_tokens WHERE credit_id = ? FOR UPDATE`,
            [creditId]
        );
        if (existing.length) throw new Error(`Credit #${creditId} already has token record #${existing[0].blockchain_token_id}. Refresh the dashboard.`);

        // Recover safely from older/partial data where the credit status was changed
        // to TOKENIZED but its blockchain_tokens row was never created.
        const creditStatus = String(credits[0].status || "").toUpperCase();
        if (!['ISSUED', 'TOKENIZED'].includes(creditStatus)) {
            throw new Error(`Credit #${creditId} has status ${creditStatus}; only ISSUED credits can be tokenized.`);
        }

        const wallet = String(initial_owner_wallet || credits[0].wallet_address || "").trim();
        if (!wallet) throw new Error("The company has no wallet address. Add one in Wallet Settings or enter an owner wallet before tokenizing.");
        if (wallet.length > 42) throw new Error("Owner wallet must be 42 characters or fewer.");

        const [insert] = await connection.execute(`
            INSERT INTO blockchain_tokens
            (credit_id, on_chain_token_id, contract_address, blockchain_network, mint_transaction_hash, initial_owner_wallet, minted_quantity, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
        `, [creditId, tokenId, contract, network, mintHash, wallet, credits[0].quantity]);

        await connection.execute(
            `UPDATE carbon_credits SET status = 'TOKENIZED' WHERE credit_id = ?`,
            [creditId]
        );

        await connection.execute(`
            INSERT INTO token_transfers
            (blockchain_token_id, from_wallet, to_wallet, quantity, transaction_hash, block_number, transfer_type)
            VALUES (?, ?, ?, ?, ?, NULL, 'MINT')
        `, [insert.insertId, wallet, wallet, credits[0].quantity, mintHash]);

        await connection.commit();
        transactionStarted = false;
        return res.status(201).json({
            success: true,
            message: `Credit #${creditId} tokenized successfully.`,
            data: { blockchain_token_id: insert.insertId, credit_id: creditId, on_chain_token_id: tokenId, quantity: credits[0].quantity }
        });
    } catch (error) {
        if (connection && transactionStarted) {
            try { await connection.rollback(); } catch (rollbackError) {
                console.error("Tokenization rollback error:", rollbackError.message);
            }
        }
        console.error("Tokenize credit error:", error);
        return res.status(400).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to tokenize credit"
        });
    } finally {
        if (connection) connection.release();
    }
}

async function retireCredits(req, res) {
    try {
        const { blockchain_token_id, quantity, reason, beneficiary, blockchain_tx_hash } = req.body;
        const tokenId = Number(blockchain_token_id);
        const qty = Number(quantity);
        if (!Number.isInteger(tokenId) || !Number.isInteger(qty) || qty <= 0) {
            return res.status(400).json({ success: false, message: "Valid token ID and positive quantity are required" });
        }
        const [result] = await pool.query(`CALL sp_retire_credits(?, ?, ?, ?, ?, ?)`, [
            req.user.user_id, tokenId, qty, reason || null, beneficiary || null, blockchain_tx_hash || null
        ]);
        const row = unwrapCall(result);
        res.status(201).json({ success: true, message: "Credits retired successfully", data: { retirement_id: row?.retirement_id || null } });
    } catch (error) {
        console.error("Retire credits error:", error);
        res.status(400).json({ success: false, message: error.sqlMessage || error.message || "Failed to retire credits" });
    }
}

async function getMyRetirements(req, res) {
    try {
        const [rows] = await pool.execute(`
            SELECT
                cr.retirement_id,
                cr.quantity,
                cr.reason,
                cr.beneficiary,
                cr.blockchain_tx_hash,
                cr.retired_at,
                bt.blockchain_token_id,
                bt.on_chain_token_id,
                cc.credit_id,
                cp.project_id,
                cp.project_name
            FROM credit_retirements cr
            JOIN companies c ON c.company_id = cr.company_id
            JOIN blockchain_tokens bt ON bt.blockchain_token_id = cr.blockchain_token_id
            JOIN carbon_credits cc ON cc.credit_id = bt.credit_id
            JOIN project_verifications pv ON pv.verification_id = cc.verification_id
            JOIN carbon_projects cp ON cp.project_id = pv.project_id
            WHERE c.user_id = ?
            ORDER BY cr.retirement_id DESC
        `, [req.user.user_id]);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error("Retirements error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message || "Failed to retrieve retirements" });
    }
}

module.exports = {
    getIssuanceQueue,
    issueCredits,
    getMyCredits,
    getTokenizationQueue,
    tokenizeCredit,
    retireCredits,
    getMyRetirements
};
