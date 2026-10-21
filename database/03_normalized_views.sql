USE carbon_v2;

-- ============================================================
-- CARBONX - NORMALIZED VIEWS (carbon_v2)
-- Relational Views for Reporting, Audit, and Operations
-- ============================================================

DROP VIEW IF EXISTS vw_active_marketplace;
DROP VIEW IF EXISTS vw_company_projects;
DROP VIEW IF EXISTS vw_project_verification;
DROP VIEW IF EXISTS vw_carbon_credit_summary;
DROP VIEW IF EXISTS vw_blockchain_tokens;
DROP VIEW IF EXISTS vw_transaction_history;
DROP VIEW IF EXISTS vw_company_portfolio;
DROP VIEW IF EXISTS vw_retired_credits;
DROP VIEW IF EXISTS vw_market_analysis;
DROP VIEW IF EXISTS vw_price_prediction;
DROP VIEW IF EXISTS vw_token_transfer_history;
DROP VIEW IF EXISTS vw_company_credit_balance;
DROP VIEW IF EXISTS vw_verifier_pending_work;
DROP VIEW IF EXISTS vw_completion_reviews;
DROP VIEW IF EXISTS vw_price_change_requests;
DROP VIEW IF EXISTS vw_admin_dashboard;

-- 1. ACTIVE MARKETPLACE
CREATE VIEW vw_active_marketplace AS
SELECT
    ml.listing_id,
    cp.project_id,
    cp.project_name,
    pt.type_name AS project_type,
    cp.location,
    sc.company_id AS seller_company_id,
    su.user_id AS seller_user_id,
    sc.company_name AS seller_company,
    su.full_name AS seller_name,
    ml.quantity_listed,
    ml.quantity_available,
    cpa.price_per_credit,
    ml.status,
    ml.listed_at,
    ml.expires_at,
    bt.blockchain_token_id,
    bt.on_chain_token_id,
    bt.contract_address,
    bt.blockchain_network
FROM marketplace_listings ml
JOIN companies sc ON sc.company_id = ml.seller_company_id
JOIN users su ON su.user_id = sc.user_id
JOIN credit_price_approvals cpa ON cpa.price_approval_id = ml.price_approval_id
JOIN blockchain_tokens bt ON bt.blockchain_token_id = ml.blockchain_token_id
JOIN carbon_credits cc ON cc.credit_id = bt.credit_id
JOIN project_verifications pv ON pv.verification_id = cc.verification_id
JOIN carbon_projects cp ON cp.project_id = pv.project_id
JOIN project_types pt ON pt.project_type_id = cp.project_type_id
WHERE ml.status IN ('ACTIVE', 'PARTIALLY_SOLD')
  AND ml.quantity_available > 0;

-- 2. COMPANY PROJECTS
CREATE VIEW vw_company_projects AS
SELECT
    c.company_id,
    c.company_name,
    u.user_id AS owner_user_id,
    u.full_name AS company_owner,
    cp.project_id,
    cp.project_name,
    pt.type_name AS project_type,
    cp.description,
    cp.location,
    cp.estimated_co2_reduction,
    cp.start_date,
    cp.end_date,
    cp.status,
    cp.created_at,
    cp.updated_at
FROM carbon_projects cp
JOIN companies c ON c.company_id = cp.owner_company_id
JOIN users u ON u.user_id = c.user_id
JOIN project_types pt ON pt.project_type_id = cp.project_type_id;

-- 3. PROJECT VERIFICATIONS
CREATE VIEW vw_project_verification AS
SELECT
    pv.verification_id,
    pv.project_id,
    cp.project_name,
    c.company_id,
    c.company_name,
    vu.user_id AS verifier_id,
    vu.full_name AS verifier_name,
    pv.verification_stage,
    pv.verified_co2_reduction,
    pv.credits_used,
    pv.status,
    pv.remarks,
    pv.verified_at
FROM project_verifications pv
JOIN carbon_projects cp ON cp.project_id = pv.project_id
JOIN companies c ON c.company_id = cp.owner_company_id
JOIN users vu ON vu.user_id = pv.verifier_id;

-- 4. CARBON CREDIT SUMMARY
CREATE VIEW vw_carbon_credit_summary AS
SELECT
    cc.credit_id,
    cp.project_id,
    cp.project_name,
    pt.type_name AS project_type,
    c.company_id AS owner_company_id,
    c.company_name AS owner_company,
    cc.quantity,
    cc.vintage_year,
    cc.issue_date,
    cc.status,
    cc.created_at
FROM carbon_credits cc
JOIN project_verifications pv ON pv.verification_id = cc.verification_id
JOIN carbon_projects cp ON cp.project_id = pv.project_id
JOIN project_types pt ON pt.project_type_id = cp.project_type_id
JOIN companies c ON c.company_id = cp.owner_company_id;

-- 5. BLOCKCHAIN TOKENS
CREATE VIEW vw_blockchain_tokens AS
SELECT
    bt.blockchain_token_id,
    bt.on_chain_token_id,
    bt.credit_id,
    cp.project_id,
    cp.project_name,
    c.company_id,
    c.company_name,
    bt.minted_quantity,
    bt.contract_address,
    bt.blockchain_network,
    bt.mint_transaction_hash,
    bt.initial_owner_wallet,
    bt.status,
    bt.minted_at
FROM blockchain_tokens bt
JOIN carbon_credits cc ON cc.credit_id = bt.credit_id
JOIN project_verifications pv ON pv.verification_id = cc.verification_id
JOIN carbon_projects cp ON cp.project_id = pv.project_id
JOIN companies c ON c.company_id = cp.owner_company_id;

-- 6. TRANSACTION HISTORY
CREATE VIEW vw_transaction_history AS
SELECT
    t.transaction_id,
    t.transaction_date,
    t.listing_id,
    bc.company_id AS buyer_company_id,
    bc.company_name AS buyer_company,
    bu.user_id AS buyer_user_id,
    sc.company_id AS seller_company_id,
    sc.company_name AS seller_company,
    su.user_id AS seller_user_id,
    cp.project_id,
    cp.project_name,
    bt.blockchain_token_id,
    bt.on_chain_token_id,
    t.quantity,
    t.price_per_credit,
    t.total_amount,
    t.blockchain_tx_hash,
    t.transaction_status
FROM transactions t
JOIN companies bc ON bc.company_id = t.buyer_company_id
JOIN users bu ON bu.user_id = bc.user_id
JOIN marketplace_listings ml ON ml.listing_id = t.listing_id
JOIN companies sc ON sc.company_id = ml.seller_company_id
JOIN users su ON su.user_id = sc.user_id
JOIN blockchain_tokens bt ON bt.blockchain_token_id = ml.blockchain_token_id
JOIN carbon_credits cc ON cc.credit_id = bt.credit_id
JOIN project_verifications pv ON pv.verification_id = cc.verification_id
JOIN carbon_projects cp ON cp.project_id = pv.project_id;

-- 7. COMPANY PORTFOLIO
CREATE VIEW vw_company_portfolio AS
SELECT
    cch.holding_id,
    c.company_id,
    c.company_name,
    u.user_id,
    u.wallet_address,
    cc.credit_id,
    cp.project_id,
    cp.project_name,
    pt.type_name AS project_type,
    cc.vintage_year,
    cch.quantity_owned,
    bt.blockchain_token_id,
    bt.on_chain_token_id,
    bt.status AS token_status,
    cch.updated_at
FROM company_credit_holdings cch
JOIN companies c ON c.company_id = cch.company_id
JOIN users u ON u.user_id = c.user_id
JOIN carbon_credits cc ON cc.credit_id = cch.credit_id
JOIN project_verifications pv ON pv.verification_id = cc.verification_id
JOIN carbon_projects cp ON cp.project_id = pv.project_id
JOIN project_types pt ON pt.project_type_id = cp.project_type_id
LEFT JOIN blockchain_tokens bt ON bt.credit_id = cc.credit_id;

-- 8. RETIRED CREDITS
CREATE VIEW vw_retired_credits AS
SELECT
    cr.retirement_id,
    cr.retired_at,
    c.company_id,
    c.company_name,
    cp.project_id,
    cp.project_name,
    bt.blockchain_token_id,
    bt.on_chain_token_id,
    cr.quantity,
    cr.reason,
    cr.beneficiary,
    cr.blockchain_tx_hash
FROM credit_retirements cr
JOIN companies c ON c.company_id = cr.company_id
JOIN blockchain_tokens bt ON bt.blockchain_token_id = cr.blockchain_token_id
JOIN carbon_credits cc ON cc.credit_id = bt.credit_id
JOIN project_verifications pv ON pv.verification_id = cc.verification_id
JOIN carbon_projects cp ON cp.project_id = pv.project_id;

-- 9. MARKET ANALYSIS
CREATE VIEW vw_market_analysis AS
SELECT
    market_data_id,
    recorded_at,
    average_price,
    demand,
    supply,
    trading_volume,
    CASE
        WHEN demand > supply THEN 'HIGH_DEMAND'
        WHEN demand < supply THEN 'HIGH_SUPPLY'
        ELSE 'BALANCED'
    END AS market_condition
FROM market_data;

-- 10. PRICE PREDICTIONS
CREATE VIEW vw_price_prediction AS
SELECT
    prediction_id,
    generated_at,
    target_date,
    current_price,
    predicted_price,
    ROUND((predicted_price - current_price), 2) AS price_difference,
    ROUND(((predicted_price - current_price) / NULLIF(current_price, 0)) * 100, 2) AS percentage_change,
    model_name,
    model_version,
    confidence_score
FROM price_predictions;

-- 11. TOKEN TRANSFER HISTORY
CREATE VIEW vw_token_transfer_history AS
SELECT
    tt.transfer_id,
    tt.transferred_at,
    tt.blockchain_token_id,
    bt.on_chain_token_id,
    cp.project_id,
    cp.project_name,
    tt.from_wallet,
    tt.to_wallet,
    tt.quantity,
    tt.transaction_hash,
    tt.block_number,
    tt.transfer_type
FROM token_transfers tt
JOIN blockchain_tokens bt ON bt.blockchain_token_id = tt.blockchain_token_id
JOIN carbon_credits cc ON cc.credit_id = bt.credit_id
JOIN project_verifications pv ON pv.verification_id = cc.verification_id
JOIN carbon_projects cp ON cp.project_id = pv.project_id;

-- 12. COMPANY CREDIT BALANCE & DEFICIT CHECK
CREATE VIEW vw_company_credit_balance AS
SELECT
    c.company_id,
    u.user_id,
    u.full_name,
    c.company_name,
    COALESCE(SUM(cch.quantity_owned), 0) AS registered_credits,
    COALESCE((
        SELECT SUM(cur.credits_used)
        FROM credit_usage_reports cur
        JOIN project_completion_reports pcr ON pcr.completion_id = cur.completion_id
        JOIN carbon_projects cp ON cp.project_id = pcr.project_id
        WHERE cp.owner_company_id = c.company_id
    ), 0) AS reported_credits,
    (
        COALESCE(SUM(cch.quantity_owned), 0) -
        COALESCE((
            SELECT SUM(cur.credits_used)
            FROM credit_usage_reports cur
            JOIN project_completion_reports pcr ON pcr.completion_id = cur.completion_id
            JOIN carbon_projects cp ON cp.project_id = pcr.project_id
            WHERE cp.owner_company_id = c.company_id
        ), 0)
    ) AS credit_difference,
    CASE
        WHEN (
            COALESCE(SUM(cch.quantity_owned), 0) -
            COALESCE((
                SELECT SUM(cur.credits_used)
                FROM credit_usage_reports cur
                JOIN project_completion_reports pcr ON pcr.completion_id = cur.completion_id
                JOIN carbon_projects cp ON cp.project_id = pcr.project_id
                WHERE cp.owner_company_id = c.company_id
            ), 0)
        ) >= 0 THEN 'ELIGIBLE'
        ELSE 'DEFICIT'
    END AS project_creation_status
FROM companies c
JOIN users u ON u.user_id = c.user_id
LEFT JOIN company_credit_holdings cch ON cch.company_id = c.company_id
GROUP BY c.company_id, u.user_id, u.full_name, c.company_name;

-- 13. VERIFIER PENDING WORK
CREATE VIEW vw_verifier_pending_work AS
SELECT
    vn.notification_id,
    vn.project_id,
    vn.verifier_id,
    vn.notification_type,
    vn.notification_status,
    vn.created_at,
    cp.project_name,
    pt.type_name AS project_type,
    c.company_id,
    c.company_name,
    u.full_name AS company_owner,
    cp.start_date,
    cp.end_date,
    cp.estimated_co2_reduction
FROM verification_notifications vn
JOIN carbon_projects cp ON cp.project_id = vn.project_id
JOIN project_types pt ON pt.project_type_id = cp.project_type_id
JOIN companies c ON c.company_id = cp.owner_company_id
JOIN users u ON u.user_id = c.user_id
WHERE vn.notification_status = 'PENDING';

-- 14. COMPLETION REVIEWS
CREATE VIEW vw_completion_reviews AS
SELECT
    pcr.completion_id,
    pcr.project_id,
    cp.project_name,
    c.company_id,
    c.company_name,
    vu.user_id AS verifier_id,
    vu.full_name AS verifier_name,
    pcr.credits_used,
    pcr.remarks,
    pcr.verified_at
FROM project_completion_reports pcr
JOIN carbon_projects cp ON cp.project_id = pcr.project_id
JOIN companies c ON c.company_id = cp.owner_company_id
JOIN users vu ON vu.user_id = pcr.verifier_id;

-- 15. PRICE CHANGE REQUESTS
CREATE VIEW vw_price_change_requests AS
SELECT
    pcr.request_id,
    pcr.project_id,
    cp.project_name,
    c.company_id,
    c.company_name,
    pcr.requested_price,
    cpa.price_per_credit AS current_approved_price,
    pcr.description,
    pcr.status,
    pcr.requested_at,
    pcr.reviewed_at,
    vu.user_id AS verifier_id,
    vu.full_name AS verifier_name
FROM price_change_requests pcr
JOIN carbon_projects cp ON cp.project_id = pcr.project_id
JOIN companies c ON c.company_id = cp.owner_company_id
LEFT JOIN credit_price_approvals cpa ON cpa.project_id = cp.project_id AND cpa.status = 'ACTIVE'
LEFT JOIN users vu ON vu.user_id = pcr.verifier_id;

-- 16. ADMIN DASHBOARD
CREATE VIEW vw_admin_dashboard AS
SELECT
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM companies) AS total_companies,
    (SELECT COUNT(*) FROM carbon_projects) AS total_projects,
    (SELECT COUNT(*) FROM carbon_projects WHERE status IN ('APPROVED','IN_PROGRESS','COMPLETION_PENDING','COMPLETED','CREDITS_ISSUED')) AS approved_projects,
    (SELECT COUNT(*) FROM carbon_projects WHERE status = 'COMPLETED') AS completed_projects,
    (SELECT COUNT(*) FROM carbon_projects WHERE status = 'REJECTED') AS rejected_projects,
    (SELECT COUNT(*) FROM project_verifications) AS total_verifications,
    (SELECT COUNT(*) FROM project_verifications WHERE status = 'APPROVED') AS approved_verifications,
    (SELECT COALESCE(SUM(quantity), 0) FROM carbon_credits) AS total_credits_issued,
    (SELECT COALESCE(SUM(quantity), 0) FROM carbon_credits WHERE status = 'TOKENIZED') AS total_credits_tokenized,
    (SELECT COALESCE(SUM(quantity), 0) FROM transactions WHERE transaction_status = 'SUCCESSFUL') AS total_credits_traded,
    (SELECT COALESCE(SUM(quantity), 0) FROM credit_retirements) AS total_credits_retired,
    (SELECT COUNT(*) FROM blockchain_tokens) AS total_tokens,
    (SELECT COUNT(*) FROM marketplace_listings WHERE status IN ('ACTIVE','PARTIALLY_SOLD')) AS active_listings,
    (SELECT COUNT(*) FROM transactions WHERE transaction_status = 'SUCCESSFUL') AS successful_transactions,
    (SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE transaction_status = 'SUCCESSFUL') AS total_transaction_value;
