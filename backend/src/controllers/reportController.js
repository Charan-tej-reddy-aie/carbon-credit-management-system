const { pool } = require("../config/database");

function csvEscape(value) {
    if (value === null || value === undefined) return "";
    const text = String(value).replace(/"/g, '""');
    return /[",\n]/.test(text) ? `"${text}"` : text;
}

async function getAdminReport(req, res) {
    try {
        const [[summary]] = await pool.execute(`
            SELECT
                (SELECT COUNT(*) FROM users) AS total_users,
                (SELECT COUNT(*) FROM companies) AS total_companies,
                (SELECT COUNT(*) FROM carbon_projects) AS total_projects,
                (SELECT COUNT(*) FROM carbon_projects WHERE status IN ('APPROVED','IN_PROGRESS','COMPLETION_PENDING','COMPLETED','CREDITS_ISSUED')) AS approved_projects,
                (SELECT COUNT(*) FROM carbon_projects WHERE status='COMPLETED') AS completed_projects,
                (SELECT COUNT(*) FROM carbon_projects WHERE status='REJECTED') AS rejected_projects,
                (SELECT COUNT(*) FROM project_verifications) AS total_verifications,
                (SELECT COUNT(*) FROM project_verifications WHERE status='APPROVED') AS approved_verifications,
                (SELECT COALESCE(SUM(quantity),0) FROM carbon_credits) AS credits_issued,
                (SELECT COALESCE(SUM(quantity),0) FROM carbon_credits WHERE status='TOKENIZED') AS tokenized_credits,
                (SELECT COALESCE(SUM(quantity),0) FROM transactions WHERE transaction_status='SUCCESSFUL') AS credits_traded,
                (SELECT COALESCE(SUM(quantity),0) FROM credit_retirements) AS credits_retired,
                (SELECT COUNT(*) FROM blockchain_tokens) AS token_count,
                (SELECT COUNT(*) FROM marketplace_listings WHERE status IN ('ACTIVE','PARTIALLY_SOLD')) AS active_listings,
                (SELECT COUNT(*) FROM transactions WHERE transaction_status='SUCCESSFUL') AS successful_transactions,
                (SELECT COALESCE(SUM(total_amount),0) FROM transactions WHERE transaction_status='SUCCESSFUL') AS transaction_value
        `);

        const [projectStatus] = await pool.execute(`
            SELECT status, COUNT(*) AS count
            FROM carbon_projects GROUP BY status ORDER BY count DESC
        `);

        const [projectTypes] = await pool.execute(`
            SELECT pt.type_name AS project_type, COUNT(cp.project_id) AS project_count,
                   COALESCE(SUM(cp.estimated_co2_reduction),0) AS estimated_co2_reduction
            FROM project_types pt
            LEFT JOIN carbon_projects cp ON cp.project_type_id = pt.project_type_id
            GROUP BY pt.project_type_id, pt.type_name
            ORDER BY estimated_co2_reduction DESC
        `);

        const [companyPerformance] = await pool.execute(`
            SELECT c.company_name,
                   (SELECT COUNT(*) FROM carbon_projects cp WHERE cp.owner_company_id = c.company_id) AS projects,
                   (SELECT COALESCE(SUM(cc.quantity), 0)
                    FROM carbon_projects cp
                    JOIN project_verifications pv ON pv.project_id = cp.project_id
                    JOIN carbon_credits cc ON cc.verification_id = pv.verification_id
                    WHERE cp.owner_company_id = c.company_id) AS credits_issued,
                   (SELECT COALESCE(SUM(t.quantity), 0)
                    FROM transactions t
                    JOIN marketplace_listings ml ON ml.listing_id = t.listing_id
                    WHERE ml.seller_company_id = c.company_id AND t.transaction_status = 'SUCCESSFUL') AS credits_traded,
                   (SELECT COALESCE(SUM(cr.quantity), 0)
                    FROM credit_retirements cr
                    WHERE cr.company_id = c.company_id) AS credits_retired
            FROM companies c
            ORDER BY credits_issued DESC, projects DESC
            LIMIT 100
        `);

        const [recentActivity] = await pool.execute(`
            SELECT activity_type, reference_id, description, activity_time
            FROM (
                SELECT 'PROJECT_CREATED' AS activity_type, cp.project_id AS reference_id,
                       CONCAT('Project created: ', cp.project_name) AS description, cp.created_at AS activity_time
                FROM carbon_projects cp
                UNION ALL
                SELECT 'VERIFICATION', pv.verification_id,
                       CONCAT('Verification ', pv.status, ' for project #', pv.project_id), pv.verified_at
                FROM project_verifications pv
                UNION ALL
                SELECT 'CREDIT_ISSUED', cc.credit_id,
                       CONCAT('Credit batch #', cc.credit_id, ' issued: ', cc.quantity, ' credits'), cc.created_at
                FROM carbon_credits cc
                UNION ALL
                SELECT 'TOKEN_MINTED', bt.blockchain_token_id,
                       CONCAT('Token #', bt.on_chain_token_id, ' minted for credit #', bt.credit_id), bt.minted_at
                FROM blockchain_tokens bt
                UNION ALL
                SELECT 'MARKET_TRANSACTION', t.transaction_id,
                       CONCAT('Transaction #', t.transaction_id, ' — ', t.quantity, ' credits — ', t.transaction_status), t.transaction_date
                FROM transactions t
                UNION ALL
                SELECT 'CREDIT_RETIRED', cr.retirement_id,
                       CONCAT('Retired ', cr.quantity, ' credits for ', COALESCE(cr.beneficiary,'N/A')), cr.retired_at
                FROM credit_retirements cr
            ) activity
            ORDER BY activity_time DESC LIMIT 100
        `);

        res.json({ success: true, data: { summary, projectStatus, projectTypes, companyPerformance, recentActivity } });
    } catch (error) {
        console.error("Admin report error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message || "Failed to load admin reports" });
    }
}

const REPORTS = {
    projects: {
        filename: "carbonx-project-report.csv",
        query: `SELECT cp.project_id, cp.project_name, pt.type_name AS project_type,
                       c.company_name, cp.location, cp.estimated_co2_reduction,
                       cp.start_date, cp.end_date, cp.status, cp.created_at
                FROM carbon_projects cp
                JOIN project_types pt ON pt.project_type_id=cp.project_type_id
                JOIN companies c ON c.company_id=cp.owner_company_id
                ORDER BY cp.project_id DESC`
    },
    credits: {
        filename: "carbonx-credit-report.csv",
        query: `SELECT cc.credit_id, cp.project_name, c.company_name, cc.quantity,
                       cc.vintage_year, cc.issue_date, cc.status, cc.created_at
                FROM carbon_credits cc
                JOIN project_verifications pv ON pv.verification_id=cc.verification_id
                JOIN carbon_projects cp ON cp.project_id=pv.project_id
                JOIN companies c ON c.company_id=cp.owner_company_id
                ORDER BY cc.credit_id DESC`
    },
    transactions: {
        filename: "carbonx-transaction-report.csv",
        query: `SELECT t.transaction_id, t.transaction_date,
                       bc.company_name AS buyer_company, sc.company_name AS seller_company,
                       cp.project_name, t.quantity, t.price_per_credit,
                       t.total_amount, t.transaction_status, t.blockchain_tx_hash
                FROM transactions t
                JOIN companies bc ON bc.company_id=t.buyer_company_id
                JOIN marketplace_listings ml ON ml.listing_id=t.listing_id
                JOIN companies sc ON sc.company_id=ml.seller_company_id
                JOIN blockchain_tokens bt ON bt.blockchain_token_id=ml.blockchain_token_id
                JOIN carbon_credits cc ON cc.credit_id=bt.credit_id
                JOIN project_verifications pv ON pv.verification_id=cc.verification_id
                JOIN carbon_projects cp ON cp.project_id=pv.project_id
                ORDER BY t.transaction_id DESC`
    },
    blockchain: {
        filename: "carbonx-blockchain-report.csv",
        query: `SELECT bt.blockchain_token_id, bt.on_chain_token_id,
                       cp.project_name, cc.credit_id, bt.minted_quantity,
                       bt.contract_address, bt.blockchain_network,
                       bt.mint_transaction_hash, bt.initial_owner_wallet,
                       bt.status, bt.minted_at
                FROM blockchain_tokens bt
                JOIN carbon_credits cc ON cc.credit_id=bt.credit_id
                JOIN project_verifications pv ON pv.verification_id=cc.verification_id
                JOIN carbon_projects cp ON cp.project_id=pv.project_id
                ORDER BY bt.blockchain_token_id DESC`
    },
    retirements: {
        filename: "carbonx-retirement-report.csv",
        query: `SELECT cr.retirement_id, cr.retired_at,
                       c.company_name, cp.project_name, cr.quantity,
                       cr.reason, cr.beneficiary, cr.blockchain_tx_hash
                FROM credit_retirements cr
                JOIN companies c ON c.company_id=cr.company_id
                JOIN blockchain_tokens bt ON bt.blockchain_token_id=cr.blockchain_token_id
                JOIN carbon_credits cc ON cc.credit_id=bt.credit_id
                JOIN project_verifications pv ON pv.verification_id=cc.verification_id
                JOIN carbon_projects cp ON cp.project_id=pv.project_id
                ORDER BY cr.retirement_id DESC`
    }
};

async function exportReport(req, res) {
    try {
        const report = REPORTS[req.params.type];
        if (!report) return res.status(400).json({ success: false, message: "Unknown report type" });
        const [rows] = await pool.execute(report.query);
        const headers = rows.length ? Object.keys(rows[0]) : [];
        const lines = [headers.join(",")];
        for (const row of rows) lines.push(headers.map(h => csvEscape(row[h])).join(","));
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${report.filename}"`);
        res.send(lines.join("\n"));
    } catch (error) {
        console.error("Report export error:", error);
        res.status(500).json({ success: false, message: error.sqlMessage || error.message || "Failed to export report" });
    }
}

module.exports = { getAdminReport, exportReport };
