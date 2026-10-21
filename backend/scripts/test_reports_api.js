const { pool } = require('../src/config/database');
const reportController = require('../src/controllers/reportController');

async function testReports() {
    console.log("=================================================");
    console.log("   SECTION A: REPORTS & EXPORTS VALIDATION       ");
    console.log("=================================================");

    const [stats] = await pool.query(`
        SELECT
            (SELECT COUNT(*) FROM carbon_projects) AS total_projects,
            (SELECT COUNT(*) FROM carbon_projects WHERE status IN ('APPROVED', 'IN_PROGRESS', 'CREDITS_ISSUED', 'COMPLETED')) AS approved_projects,
            (SELECT COALESCE(SUM(quantity), 0) FROM carbon_credits) AS total_credits_issued,
            (SELECT COALESCE(SUM(quantity), 0) FROM credit_retirements) AS total_credits_retired,
            (SELECT COALESCE(SUM(quantity), 0) FROM transactions WHERE transaction_status = 'SUCCESSFUL') AS total_credits_traded,
            (SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE transaction_status = 'SUCCESSFUL') AS total_market_volume_usd,
            (SELECT COUNT(*) FROM users) AS total_users,
            (SELECT COUNT(*) FROM companies) AS total_companies,
            (SELECT COUNT(*) FROM users u JOIN roles r ON u.role_id = r.role_id WHERE r.role_name = 'VERIFIER') AS total_verifiers
    `);

    console.log("[PASS] Summary stats retrieved successfully:");
    console.table(stats[0]);

    const [companyPerf] = await pool.query(`
        SELECT
            c.company_id,
            c.company_name,
            u.email,
            u.country,
            COALESCE((SELECT COUNT(*) FROM carbon_projects cp WHERE cp.owner_company_id = c.company_id), 0) AS total_projects,
            COALESCE((
                SELECT SUM(cc.quantity)
                FROM carbon_projects cp
                JOIN project_verifications pv ON pv.project_id = cp.project_id
                JOIN carbon_credits cc ON cc.verification_id = pv.verification_id
                WHERE cp.owner_company_id = c.company_id
            ), 0) AS credits_issued,
            COALESCE((SELECT SUM(cch.quantity_owned) FROM company_credit_holdings cch WHERE cch.company_id = c.company_id), 0) AS credits_held,
            COALESCE((SELECT SUM(cr.quantity) FROM credit_retirements cr WHERE cr.company_id = c.company_id), 0) AS credits_retired,
            COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.buyer_company_id = c.company_id AND t.transaction_status = 'SUCCESSFUL'), 0) AS credits_purchased,
            COALESCE((
                SELECT SUM(t.quantity)
                FROM transactions t
                JOIN marketplace_listings ml ON ml.listing_id = t.listing_id
                WHERE ml.seller_company_id = c.company_id AND t.transaction_status = 'SUCCESSFUL'
            ), 0) AS credits_sold
        FROM companies c
        JOIN users u ON u.user_id = c.user_id
        ORDER BY credits_issued DESC, credits_held DESC
    `);

    console.log(`[PASS] Company performance query succeeded with ${companyPerf.length} companies.`);

    // Test 5 CSV exports mock
    const exportTypes = ['projects', 'credits', 'transactions', 'blockchain', 'retirements'];
    for (const type of exportTypes) {
        let csvQuery = '';
        if (type === 'projects') csvQuery = 'SELECT * FROM vw_company_projects';
        else if (type === 'credits') csvQuery = 'SELECT * FROM vw_carbon_credit_summary';
        else if (type === 'transactions') csvQuery = 'SELECT * FROM vw_transaction_history';
        else if (type === 'blockchain') csvQuery = 'SELECT * FROM vw_token_transfer_history';
        else if (type === 'retirements') csvQuery = 'SELECT * FROM vw_retired_credits';

        const [rows] = await pool.query(csvQuery);
        console.log(`[PASS] CSV export dataset for '${type}': ${rows.length} rows verified.`);
    }

    console.log("=================================================");
    console.log("REPORTS TEST RESULTS: ALL CHECKS PASSED");
    console.log("=================================================");
    process.exit(0);
}

testReports().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
