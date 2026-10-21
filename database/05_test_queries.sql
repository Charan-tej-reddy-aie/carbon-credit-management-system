-- ============================================================
-- CARBONX - DATABASE VERIFICATION & TEST QUERIES
-- Schema: carbon_v2 (Normalized 3NF Relational Architecture)
-- ============================================================
-- Canonical Installation Sequence:
--   1. 01_normalized_schema.sql             (Tables, Foreign Keys, Indexes)
--   2. 02_normalized_procedures_triggers.sql (ACID Stored Procedures & Triggers)
--   3. 03_normalized_views.sql               (16 Analytical & Operational Views)
--   4. 04_sample_seed_data.sql               (Deterministic Initial Seed Dataset)
--   5. 05_test_queries.sql                   (Verification & Validation Suite)
-- ============================================================

USE carbon_v2;

-- ============================================================
-- SECTION 1: SCHEMA STRUCTURE & INTEGRITY VALIDATION
-- ============================================================

-- 1.1 Verify Current Database
SELECT DATABASE() AS active_database;

-- 1.2 List All Base Tables and Row Counts
SELECT
    TABLE_NAME,
    TABLE_ROWS,
    ENGINE,
    CREATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'carbon_v2'
  AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

-- 1.3 Verify Foreign Key Constraints
SELECT
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'carbon_v2'
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- 1.4 Verify Indexes for High-Traffic Queries
SELECT
    TABLE_NAME,
    INDEX_NAME,
    NON_UNIQUE,
    COLUMN_NAME,
    SEQ_IN_INDEX
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'carbon_v2'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- 1.5 Verify User Roles and Account Statuses
SELECT
    u.user_id,
    u.full_name,
    u.email,
    r.role_name,
    c.company_name,
    u.country,
    u.wallet_address,
    u.account_status
FROM users u
JOIN roles r ON u.role_id = r.role_id
LEFT JOIN companies c ON u.user_id = c.user_id
ORDER BY u.user_id;


-- ============================================================
-- SECTION 2: VERIFICATION OF ALL 16 NORMALIZED VIEWS
-- ============================================================

-- 2.1 Admin Overview Dashboard
SELECT * FROM vw_admin_dashboard;

-- 2.2 Company Projects Overview
SELECT * FROM vw_company_projects ORDER BY project_id;

-- 2.3 Project Verification Log
SELECT * FROM vw_project_verification ORDER BY verification_id;

-- 2.4 Carbon Credit Summary
SELECT * FROM vw_carbon_credit_summary ORDER BY credit_id;

-- 2.5 Blockchain Token Tracking
SELECT * FROM vw_blockchain_tokens ORDER BY blockchain_token_id;

-- 2.6 Active Marketplace Listings
SELECT * FROM vw_active_marketplace ORDER BY price_per_credit ASC;

-- 2.7 Transaction History (with Simulated Blockchain Hashes)
SELECT * FROM vw_transaction_history ORDER BY transaction_id DESC;

-- 2.8 Company Portfolios & Holdings
SELECT * FROM vw_company_portfolio ORDER BY quantity_owned DESC;

-- 2.9 Retired Credits & Certificates
SELECT * FROM vw_retired_credits ORDER BY retired_at DESC;

-- 2.10 Market Analysis & Supply-Demand Metrics
SELECT * FROM vw_market_analysis ORDER BY recorded_at DESC;

-- 2.11 Price Prediction Analytics
SELECT * FROM vw_price_prediction ORDER BY target_date ASC;

-- 2.12 Token Transfer History Audit Log
SELECT * FROM vw_token_transfer_history ORDER BY transfer_id DESC;

-- 2.13 Company Credit Balance & Deficit/Surplus Tracking
SELECT * FROM vw_company_credit_balance ORDER BY credit_difference DESC;

-- 2.14 Verifier Pending Work Queue
SELECT * FROM vw_verifier_pending_work ORDER BY created_at ASC;

-- 2.15 Verifier Completion Reviews Queue
SELECT * FROM vw_completion_reviews ORDER BY verified_at DESC;

-- 2.16 Price Change Requests Review Log
SELECT * FROM vw_price_change_requests ORDER BY request_id DESC;


-- ============================================================
-- SECTION 3: FINANCIAL RECONCILIATION & BALANCE INVARIANTS
-- ============================================================

-- 3.1 Invariant Check: Issued Credits vs Company Holdings + Retired Credits
SELECT
    (SELECT COALESCE(SUM(quantity), 0) FROM carbon_credits) AS total_credits_issued,
    (SELECT COALESCE(SUM(quantity_owned), 0) FROM company_credit_holdings) AS total_currently_held,
    (SELECT COALESCE(SUM(quantity), 0) FROM credit_retirements) AS total_retired,
    ((SELECT COALESCE(SUM(quantity_owned), 0) FROM company_credit_holdings) +
     (SELECT COALESCE(SUM(quantity), 0) FROM credit_retirements)) AS calculated_total,
    CASE
        WHEN (SELECT COALESCE(SUM(quantity), 0) FROM carbon_credits) =
             ((SELECT COALESCE(SUM(quantity_owned), 0) FROM company_credit_holdings) +
              (SELECT COALESCE(SUM(quantity), 0) FROM credit_retirements))
        THEN 'PASSED: CREDIT LEDGER BALANCED'
        ELSE 'WARNING: AUDIT RECONCILIATION DISCREPANCY'
    END AS credit_integrity_status;

-- 3.2 Invariant Check: Marketplace Volume vs Successful Transactions
SELECT
    COALESCE(SUM(quantity), 0) AS total_traded_volume,
    COALESCE(SUM(total_amount), 0) AS total_trading_value,
    COUNT(*) AS total_trades_count
FROM transactions
WHERE transaction_status = 'SUCCESSFUL';

-- 3.3 Token Transfer Audit vs Transactions
SELECT
    t.transaction_id,
    t.blockchain_tx_hash,
    t.quantity,
    tt.transfer_id,
    tt.from_wallet,
    tt.to_wallet,
    tt.block_number,
    tt.transferred_at
FROM transactions t
LEFT JOIN token_transfers tt ON t.blockchain_tx_hash = tt.transaction_hash
WHERE t.transaction_status = 'SUCCESSFUL';


-- ============================================================
-- SECTION 4: STORED PROCEDURE TESTS & ROLLBACK VALIDATION
-- ============================================================

-- 4.1 Test Project Creation (Valid Flow)
-- Expected: Creates project in SUBMITTED status and notifies Verifier
CALL sp_create_project(
    2, -- GreenPower user_id
    'Rooftop Solar Phase 3',
    'Renewable Energy',
    'Demonstration test project for procedure verification',
    'Hyderabad, India',
    2500.00,
    CURDATE(),
    DATE_ADD(CURDATE(), INTERVAL 365 DAY)
);
SELECT MAX(project_id) INTO @new_project_id FROM carbon_projects;

SELECT project_id, project_name, status, estimated_co2_reduction
FROM carbon_projects
WHERE project_id = @new_project_id;

SELECT * FROM verification_notifications WHERE project_id = @new_project_id;

-- 4.2 Test Project Verification (Start Approval)
-- Expected: Transitions status to IN_PROGRESS and creates COMPLETION_REVIEW notification
CALL sp_verify_project(
    @new_project_id,
    9, -- Verifier user_id (verifier@carbon.com)
    2400.00,
    'APPROVED',
    'Audit passed technical inspection'
);

SELECT project_id, project_name, status FROM carbon_projects WHERE project_id = @new_project_id;
SELECT * FROM project_verifications WHERE project_id = @new_project_id;

-- 4.3 Clean up the demonstration test project to keep database pristine
DELETE FROM verification_notifications WHERE project_id = @new_project_id;
DELETE FROM project_verifications WHERE project_id = @new_project_id;
DELETE FROM carbon_projects WHERE project_id = @new_project_id;


-- 4.4 Test Negative Constraints & Rollback Safety:
-- Scenario A: Attempt to create project with Negative CO2 (Should fail CHECK constraint)
-- Expected: ERROR 3819 (HY000): Check constraint 'chk_project_co2' is violated.
-- INSERT INTO carbon_projects (owner_company_id, project_type_id, project_name, description, location, estimated_co2_reduction, start_date, end_date, status)
-- VALUES (1, 1, 'Invalid Negative CO2 Project', 'Test', 'Test', -500.00, CURDATE(), CURDATE(), 'SUBMITTED');

-- Scenario B: Attempt to purchase more credits than available in listing
-- Expected: ERROR 45000: Requested quantity exceeds available credits in listing
-- CALL sp_purchase_credits(1, 4, 999999, NULL);

-- Scenario C: Attempt self-purchase (Company buying from its own listing)
-- Expected: ERROR 45000: Buyer cannot purchase credits from their own listing
-- CALL sp_purchase_credits(1, 2, 10, NULL);

-- Scenario D: Attempt to list more credits than company holds
-- Expected: ERROR 45000: Insufficient available credit holdings to create this listing
-- CALL sp_create_listing(2, 1, 999999, 50.00, 1, 30);


-- ============================================================
-- SECTION 5: ANALYTICS & MARKET INTELLIGENCE QUERIES
-- ============================================================

-- 5.1 Project Distribution by Sector & CO2 Potential
SELECT
    pt.type_name AS sector,
    COUNT(DISTINCT cp.project_id) AS total_projects,
    COALESCE(SUM(cp.estimated_co2_reduction), 0) AS total_estimated_co2,
    COALESCE(SUM(cc.quantity), 0) AS total_credits_issued
FROM project_types pt
LEFT JOIN carbon_projects cp ON pt.project_type_id = cp.project_type_id
LEFT JOIN project_verifications pv ON cp.project_id = pv.project_id
LEFT JOIN carbon_credits cc ON pv.verification_id = cc.verification_id
GROUP BY pt.type_name
ORDER BY total_estimated_co2 DESC;

-- 5.2 Company Compliance & Trading Performance Summary
SELECT
    c.company_name,
    u.country,
    COALESCE(bal.registered_credits, 0) AS registered_credits,
    COALESCE(bal.reported_credits, 0) AS reported_credits,
    COALESCE(bal.credit_difference, 0) AS credit_difference,
    COALESCE(bal.project_creation_status, 'ELIGIBLE') AS project_creation_status,
    COALESCE(SUM(cch.quantity_owned), 0) AS total_held_credits,
    COALESCE(purch.total_spent_usd, 0) AS total_spent_usd
FROM companies c
JOIN users u ON c.user_id = u.user_id
LEFT JOIN vw_company_credit_balance bal ON c.company_id = bal.company_id
LEFT JOIN company_credit_holdings cch ON c.company_id = cch.company_id
LEFT JOIN (
    SELECT buyer_company_id, SUM(total_amount) AS total_spent_usd
    FROM transactions WHERE transaction_status = 'SUCCESSFUL'
    GROUP BY buyer_company_id
) purch ON c.company_id = purch.buyer_company_id
GROUP BY c.company_id, c.company_name, u.country, bal.registered_credits, bal.reported_credits, bal.credit_difference, bal.project_creation_status, purch.total_spent_usd
ORDER BY c.company_id;

-- 5.3 14-Day Historical Market Trends & Moving Average
SELECT
    recorded_at,
    average_price,
    demand,
    supply,
    demand - supply AS net_market_pressure,
    trading_volume,
    ROUND(AVG(average_price) OVER (ORDER BY recorded_at ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS rolling_3d_avg_price
FROM market_data
ORDER BY recorded_at DESC;

-- ============================================================
-- END OF VERIFICATION SUITE
-- ============================================================
