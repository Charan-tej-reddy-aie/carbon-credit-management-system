const { pool } = require("../config/database");

function unwrap(result) { return result?.[0]?.[0] || null; }

async function getPricingProjects(req, res) {
    try {
        const [rows] = await pool.execute(`
            SELECT
                cp.project_id,
                cp.project_name,
                cp.status,
                c.company_name,
                cc.credit_id,
                cc.quantity,
                cc.status AS credit_status,
                bt.blockchain_token_id,
                cpa.price_approval_id,
                cpa.price_per_credit,
                cpa.status AS price_status,
                cpa.approved_at
            FROM carbon_projects cp
            JOIN companies c ON c.company_id = cp.owner_company_id
            JOIN carbon_credits cc
              ON cc.verification_id = (
                    SELECT pv.verification_id
                    FROM project_verifications pv
                    WHERE pv.project_id = cp.project_id
                      AND pv.verification_stage = 'START_APPROVAL'
                      AND pv.status = 'APPROVED'
                    ORDER BY pv.verification_id DESC LIMIT 1
              )
            LEFT JOIN blockchain_tokens bt ON bt.credit_id = cc.credit_id
            LEFT JOIN credit_price_approvals cpa
              ON cpa.project_id = cp.project_id AND cpa.status = 'ACTIVE'
            WHERE cp.status IN ('COMPLETED','CREDITS_ISSUED')
            ORDER BY cp.project_id DESC
        `);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error("Pricing projects error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message || "Failed to load pricing projects" });
    }
}

async function approvePrice(req, res) {
    try {
        const projectId = Number(req.body.project_id);
        const price = Number(req.body.price_per_credit);
        if (!Number.isInteger(projectId) || !Number.isFinite(price) || price <= 0) {
            return res.status(400).json({ success: false, message: "Valid project ID and positive price are required" });
        }
        const [result] = await pool.query(`CALL sp_approve_credit_price(?, ?, ?)`, [projectId, req.user.user_id, price]);
        const row = unwrap(result);
        res.status(201).json({ success: true, message: "Credit price approved successfully", data: { project_id: projectId, price_approval_id: row?.price_approval_id || null, price_per_credit: price } });
    } catch (error) {
        console.error("Approve price error:", error);
        res.status(400).json({ success: false, message: error.sqlMessage || error.message || "Failed to approve credit price" });
    }
}

async function getPendingPriceRequests(req, res) {
    try {
        const [rows] = await pool.execute(`
            SELECT
                pcr.request_id,
                pcr.project_id,
                pcr.requested_price,
                pcr.description,
                pcr.status,
                pcr.requested_at,
                cp.project_name,
                c.company_name,
                cpa.price_per_credit AS current_price
            FROM price_change_requests pcr
            JOIN carbon_projects cp ON cp.project_id = pcr.project_id
            JOIN companies c ON c.company_id = cp.owner_company_id
            LEFT JOIN credit_price_approvals cpa
              ON cpa.project_id = pcr.project_id AND cpa.status = 'ACTIVE'
            WHERE pcr.status = 'PENDING'
            ORDER BY pcr.request_id DESC
        `);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error("Pending price requests error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message || "Failed to load price requests" });
    }
}

async function reviewPriceRequest(req, res) {
    try {
        const requestId = Number(req.body.request_id);
        const status = String(req.body.status || "").toUpperCase();
        if (!Number.isInteger(requestId) || !["APPROVED", "REJECTED"].includes(status)) {
            return res.status(400).json({ success: false, message: "Valid request ID and APPROVED/REJECTED status are required" });
        }
        const [result] = await pool.query(`CALL sp_review_price_change(?, ?, ?)`, [requestId, req.user.user_id, status]);
        const row = unwrap(result);
        res.json({ success: true, message: `Price request ${status.toLowerCase()} successfully`, data: row || { request_id: requestId, status } });
    } catch (error) {
        console.error("Review price request error:", error);
        res.status(400).json({ success: false, message: error.sqlMessage || error.message || "Failed to review price request" });
    }
}

module.exports = { getPricingProjects, approvePrice, getPendingPriceRequests, reviewPriceRequest };
