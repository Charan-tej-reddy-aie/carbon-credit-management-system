-- ============================================================
-- CarbonX normalization data migration
-- Source: existing `carbon` database
-- Target: normalized `carbon_v2` database
--
-- IMPORTANT:
-- 1. Back up the current `carbon` database before running this.
-- 2. Run 01_normalized_schema.sql first.
-- 3. This script copies data; it does NOT delete the old database.
-- 4. Stored procedures/views/backend code must be updated after migration.
-- ============================================================

USE carbon_v2;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
INSERT INTO users (
    user_id,
    full_name,
    email,
    password_hash,
    role_id,
    wallet_address,
    country,
    account_status,
    created_at,
    updated_at
)
SELECT
    u.user_id,
    u.full_name,
    u.email,
    u.password_hash,
    r.role_id,
    u.wallet_address,
    u.country,
    u.account_status,
    u.created_at,
    u.updated_at
FROM carbon.users u
JOIN roles r
    ON r.role_name = u.role;

-- ------------------------------------------------------------
-- COMPANIES
-- Existing company accounts are represented by COMPANY users.
-- ------------------------------------------------------------
INSERT INTO companies (
    company_id,
    user_id,
    company_name
)
SELECT
    u.user_id,
    u.user_id,
    u.company_name
FROM carbon.users u
WHERE u.role = 'COMPANY'
  AND u.company_name IS NOT NULL
  AND u.company_name <> '';

-- Make auto-increment continue after imported IDs.
ALTER TABLE companies AUTO_INCREMENT = 1000;

-- ------------------------------------------------------------
-- PROJECT TYPES
-- ------------------------------------------------------------
INSERT INTO project_types (type_name)
SELECT DISTINCT
    TRIM(project_type)
FROM carbon.carbon_projects
WHERE project_type IS NOT NULL
  AND TRIM(project_type) <> '';

-- ------------------------------------------------------------
-- PROJECTS
-- ------------------------------------------------------------
INSERT INTO carbon_projects (
    project_id,
    owner_company_id,
    project_type_id,
    project_name,
    description,
    location,
    estimated_co2_reduction,
    start_date,
    end_date,
    status,
    created_at,
    updated_at
)
SELECT
    cp.project_id,
    c.company_id,
    pt.project_type_id,
    cp.project_name,
    cp.description,
    cp.location,
    cp.estimated_co2_reduction,
    cp.start_date,
    cp.end_date,
    CASE cp.status
        WHEN 'DRAFT' THEN 'DRAFT'
        WHEN 'SUBMITTED' THEN 'SUBMITTED'
        WHEN 'UNDER_REVIEW' THEN 'UNDER_REVIEW'
        WHEN 'APPROVED' THEN 'APPROVED'
        WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'
        WHEN 'COMPLETION_PENDING' THEN 'COMPLETION_PENDING'
        WHEN 'COMPLETED' THEN 'COMPLETED'
        WHEN 'REJECTED' THEN 'REJECTED'
        WHEN 'CREDITS_ISSUED' THEN 'CREDITS_ISSUED'
        ELSE 'SUBMITTED'
    END,
    cp.created_at,
    cp.updated_at
FROM carbon.carbon_projects cp
JOIN companies c
    ON c.user_id = cp.owner_id
JOIN project_types pt
    ON pt.type_name = TRIM(cp.project_type);

-- ------------------------------------------------------------
-- PROJECT DOCUMENTS
-- ------------------------------------------------------------
INSERT INTO project_documents (
    document_id,
    project_id,
    document_name,
    document_type,
    file_url,
    uploaded_at
)
SELECT
    document_id,
    project_id,
    document_name,
    document_type,
    file_url,
    uploaded_at
FROM carbon.project_documents;

-- ------------------------------------------------------------
-- PROJECT VERIFICATIONS
-- ------------------------------------------------------------
INSERT INTO project_verifications (
    verification_id,
    project_id,
    verifier_id,
    verification_stage,
    verified_co2_reduction,
    credits_used,
    status,
    remarks,
    verified_at
)
SELECT
    pv.verification_id,
    pv.project_id,
    pv.verifier_id,
    COALESCE(pv.verification_stage, 'START_APPROVAL'),
    pv.verified_co2_reduction,
    pv.credits_used,
    pv.status,
    pv.remarks,
    pv.verified_at
FROM carbon.project_verifications pv;

-- ------------------------------------------------------------
-- VERIFICATION NOTIFICATIONS
-- ------------------------------------------------------------
INSERT INTO verification_notifications (
    notification_id,
    project_id,
    verifier_id,
    notification_type,
    notification_status,
    created_at,
    completed_at
)
SELECT
    notification_id,
    project_id,
    verifier_id,
    notification_type,
    notification_status,
    created_at,
    completed_at
FROM carbon.verification_notifications;

-- ------------------------------------------------------------
-- COMPLETION REPORTS
-- ------------------------------------------------------------
INSERT INTO project_completion_reports (
    completion_id,
    project_id,
    verifier_id,
    credits_used,
    remarks,
    verified_at
)
SELECT
    completion_id,
    project_id,
    verifier_id,
    credits_used,
    remarks,
    verified_at
FROM carbon.project_completion_reports;

-- ------------------------------------------------------------
-- CARBON CREDITS
-- project_id is intentionally not copied because it is now
-- derived through verification_id -> project_id.
-- ------------------------------------------------------------
INSERT INTO carbon_credits (
    credit_id,
    verification_id,
    quantity,
    vintage_year,
    issue_date,
    status,
    created_at
)
SELECT
    cc.credit_id,
    cc.verification_id,
    cc.quantity,
    cc.vintage_year,
    cc.issue_date,
    cc.status,
    cc.created_at
FROM carbon.carbon_credits cc
JOIN project_verifications pv
    ON pv.verification_id = cc.verification_id;

-- ------------------------------------------------------------
-- COMPANY HOLDINGS
-- Old company_id was the user_id of the COMPANY account.
-- ------------------------------------------------------------
INSERT INTO company_credit_holdings (
    holding_id,
    company_id,
    credit_id,
    quantity_owned,
    updated_at
)
SELECT
    h.holding_id,
    c.company_id,
    h.credit_id,
    h.quantity_owned,
    h.updated_at
FROM carbon.company_credit_holdings h
JOIN companies c
    ON c.user_id = h.company_id;

-- ------------------------------------------------------------
-- BLOCKCHAIN TOKENS
-- ------------------------------------------------------------
INSERT INTO blockchain_tokens (
    blockchain_token_id,
    credit_id,
    on_chain_token_id,
    contract_address,
    blockchain_network,
    mint_transaction_hash,
    initial_owner_wallet,
    minted_quantity,
    minted_at,
    status
)
SELECT
    blockchain_token_id,
    credit_id,
    on_chain_token_id,
    contract_address,
    blockchain_network,
    mint_transaction_hash,
    initial_owner_wallet,
    minted_quantity,
    minted_at,
    status
FROM carbon.blockchain_tokens;

-- ------------------------------------------------------------
-- TOKEN TRANSFERS
-- ------------------------------------------------------------
INSERT INTO token_transfers (
    transfer_id,
    blockchain_token_id,
    from_wallet,
    to_wallet,
    quantity,
    transaction_hash,
    block_number,
    transfer_type,
    transferred_at
)
SELECT
    transfer_id,
    blockchain_token_id,
    from_wallet,
    to_wallet,
    quantity,
    transaction_hash,
    block_number,
    transfer_type,
    transferred_at
FROM carbon.token_transfers;

-- ------------------------------------------------------------
-- CREDIT USAGE REPORTS
-- company_id and project_id are removed in normalized design.
-- ------------------------------------------------------------
INSERT INTO credit_usage_reports (
    usage_report_id,
    completion_id,
    credits_used,
    reported_at
)
SELECT
    cur.usage_report_id,
    cur.completion_id,
    cur.credits_used,
    cur.reported_at
FROM carbon.credit_usage_reports cur
JOIN project_completion_reports pcr
    ON pcr.completion_id = cur.completion_id;

-- ------------------------------------------------------------
-- PRICE APPROVALS
-- ------------------------------------------------------------
INSERT INTO credit_price_approvals (
    price_approval_id,
    project_id,
    verifier_id,
    price_per_credit,
    status,
    approved_at
)
SELECT
    price_approval_id,
    project_id,
    verifier_id,
    price_per_credit,
    status,
    approved_at
FROM carbon.credit_price_approvals;

-- ------------------------------------------------------------
-- PRICE CHANGE REQUESTS
-- company_id/current_price are intentionally omitted.
-- ------------------------------------------------------------
INSERT INTO price_change_requests (
    request_id,
    project_id,
    requested_price,
    description,
    verifier_id,
    status,
    requested_at,
    reviewed_at
)
SELECT
    request_id,
    project_id,
    requested_price,
    description,
    verifier_id,
    status,
    requested_at,
    reviewed_at
FROM carbon.price_change_requests;

-- ------------------------------------------------------------
-- MARKETPLACE LISTINGS
-- seller_id (user) becomes seller_company_id.
-- price_per_credit is now obtained through price_approval_id.
-- ------------------------------------------------------------
INSERT INTO marketplace_listings (
    listing_id,
    seller_company_id,
    blockchain_token_id,
    quantity_listed,
    quantity_available,
    price_approval_id,
    status,
    listed_at,
    expires_at
)
SELECT
    ml.listing_id,
    c.company_id,
    ml.blockchain_token_id,
    ml.quantity_listed,
    ml.quantity_available,
    ml.price_approval_id,
    ml.status,
    ml.listed_at,
    ml.expires_at
FROM carbon.marketplace_listings ml
JOIN companies c
    ON c.user_id = ml.seller_id;

-- ------------------------------------------------------------
-- TRANSACTIONS
-- seller/token are derived from listing.
-- Historical price is retained as a financial snapshot.
-- ------------------------------------------------------------
INSERT INTO transactions (
    transaction_id,
    listing_id,
    buyer_company_id,
    quantity,
    price_per_credit,
    total_amount,
    blockchain_tx_hash,
    transaction_status,
    transaction_date
)
SELECT
    t.transaction_id,
    t.listing_id,
    c.company_id,
    t.quantity,
    t.price_per_credit,
    t.total_amount,
    t.blockchain_tx_hash,
    t.transaction_status,
    t.transaction_date
FROM carbon.transactions t
JOIN companies c
    ON c.user_id = t.buyer_id;

-- ------------------------------------------------------------
-- RETIREMENTS
-- ------------------------------------------------------------
INSERT INTO credit_retirements (
    retirement_id,
    company_id,
    blockchain_token_id,
    quantity,
    reason,
    beneficiary,
    blockchain_tx_hash,
    retired_at
)
SELECT
    cr.retirement_id,
    c.company_id,
    cr.blockchain_token_id,
    cr.quantity,
    cr.reason,
    cr.beneficiary,
    cr.blockchain_tx_hash,
    cr.retired_at
FROM carbon.credit_retirements cr
JOIN companies c
    ON c.user_id = cr.user_id;

-- ------------------------------------------------------------
-- MARKET DATA
-- ------------------------------------------------------------
INSERT INTO market_data (
    market_data_id,
    recorded_at,
    average_price,
    demand,
    supply,
    trading_volume
)
SELECT
    market_data_id,
    recorded_at,
    average_price,
    demand,
    supply,
    trading_volume
FROM carbon.market_data;

-- ------------------------------------------------------------
-- PRICE PREDICTIONS
-- ------------------------------------------------------------
INSERT INTO price_predictions (
    prediction_id,
    generated_at,
    target_date,
    current_price,
    predicted_price,
    model_name,
    model_version,
    confidence_score
)
SELECT
    prediction_id,
    generated_at,
    target_date,
    current_price,
    predicted_price,
    model_name,
    model_version,
    confidence_score
FROM carbon.price_predictions;

-- ------------------------------------------------------------
-- RESET AUTO_INCREMENT VALUES AFTER IMPORTING EXISTING IDs
-- ------------------------------------------------------------
SET @next_id = (SELECT COALESCE(MAX(user_id),0) + 1 FROM users);
SET @sql = CONCAT('ALTER TABLE users AUTO_INCREMENT = ', @next_id);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @next_id = (SELECT COALESCE(MAX(company_id),0) + 1 FROM companies);
SET @sql = CONCAT('ALTER TABLE companies AUTO_INCREMENT = ', @next_id);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @next_id = (SELECT COALESCE(MAX(project_id),0) + 1 FROM carbon_projects);
SET @sql = CONCAT('ALTER TABLE carbon_projects AUTO_INCREMENT = ', @next_id);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @next_id = (SELECT COALESCE(MAX(verification_id),0) + 1 FROM project_verifications);
SET @sql = CONCAT('ALTER TABLE project_verifications AUTO_INCREMENT = ', @next_id);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @next_id = (SELECT COALESCE(MAX(credit_id),0) + 1 FROM carbon_credits);
SET @sql = CONCAT('ALTER TABLE carbon_credits AUTO_INCREMENT = ', @next_id);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- BASIC VALIDATION
-- ------------------------------------------------------------
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'project_types', COUNT(*) FROM project_types
UNION ALL
SELECT 'carbon_projects', COUNT(*) FROM carbon_projects
UNION ALL
SELECT 'project_verifications', COUNT(*) FROM project_verifications
UNION ALL
SELECT 'carbon_credits', COUNT(*) FROM carbon_credits
UNION ALL
SELECT 'company_credit_holdings', COUNT(*) FROM company_credit_holdings
UNION ALL
SELECT 'blockchain_tokens', COUNT(*) FROM blockchain_tokens
UNION ALL
SELECT 'marketplace_listings', COUNT(*) FROM marketplace_listings
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'credit_retirements', COUNT(*) FROM credit_retirements;
