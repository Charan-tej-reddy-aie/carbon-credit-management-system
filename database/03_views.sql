USE carbon;

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
DROP VIEW IF EXISTS vw_verifier_pending_work;
DROP VIEW IF EXISTS vw_completion_reviews;
DROP VIEW IF EXISTS vw_price_change_requests;
DROP VIEW IF EXISTS vw_company_credit_balance;
DROP VIEW IF EXISTS vw_admin_dashboard;

CREATE VIEW vw_active_marketplace AS
SELECT
    ml.listing_id,
    cp.project_id,
    cp.project_name,
    cp.project_type,
    cp.location,
    seller.user_id AS seller_id,
    seller.company_name AS seller_company,
    seller.full_name AS seller_name,
    ml.quantity_listed,
    ml.quantity_available,
    ml.price_per_credit,
    ml.status,
    ml.listed_at,
    ml.expires_at
FROM marketplace_listings ml

JOIN users seller
    ON ml.seller_id = seller.user_id

JOIN blockchain_tokens bt
    ON ml.blockchain_token_id = bt.blockchain_token_id

JOIN carbon_credits cc
    ON bt.credit_id = cc.credit_id

JOIN carbon_projects cp
    ON cc.project_id = cp.project_id

WHERE ml.status IN (
    'ACTIVE',
    'PARTIALLY_SOLD'
)

AND seller.role = 'COMPANY';

CREATE VIEW vw_company_projects AS
SELECT
    u.user_id AS company_id,
    u.company_name,
    u.full_name AS company_owner,
    cp.project_id,
    cp.project_name,
    cp.project_type,
    cp.description,
    cp.location,
    cp.estimated_co2_reduction,
    cp.start_date,
    cp.end_date,
    cp.status,
    cp.created_at,
    cp.updated_at
FROM users u

JOIN carbon_projects cp
    ON u.user_id = cp.owner_id

WHERE u.role = 'COMPANY';

CREATE VIEW vw_project_verification AS
SELECT
    pv.verification_id,
    pv.project_id,
    cp.project_name,
    company.user_id AS company_id,
    company.company_name,
    verifier.user_id AS verifier_id,
    verifier.full_name AS verifier_name,
    pv.verification_stage,
    pv.verified_co2_reduction,
    pv.credits_used,
    pv.status,
    pv.remarks,
    pv.verified_at
FROM project_verifications pv

JOIN carbon_projects cp
    ON pv.project_id = cp.project_id

JOIN users company
    ON cp.owner_id = company.user_id

JOIN users verifier
    ON pv.verifier_id = verifier.user_id;
    
CREATE VIEW vw_carbon_credit_summary AS
SELECT
    cc.credit_id,
    cc.project_id,
    cp.project_name,
    cp.project_type,
    cp.owner_id AS company_id,
    u.company_name,
    cc.quantity,
    cc.vintage_year,
    cc.issue_date,
    cc.status
FROM carbon_credits cc

JOIN carbon_projects cp
    ON cc.project_id = cp.project_id

JOIN users u
    ON cp.owner_id = u.user_id;

CREATE VIEW vw_blockchain_tokens AS
SELECT
    bt.blockchain_token_id,
    bt.on_chain_token_id,
    bt.contract_address,
    bt.blockchain_network,
    bt.minted_quantity,
    bt.initial_owner_wallet,
    bt.minted_at,
    bt.status,
    cc.credit_id,
    cp.project_id,
    cp.project_name,
    u.company_name
FROM blockchain_tokens bt

JOIN carbon_credits cc
    ON bt.credit_id = cc.credit_id

JOIN carbon_projects cp
    ON cc.project_id = cp.project_id

JOIN users u
    ON cp.owner_id = u.user_id;

CREATE VIEW vw_transaction_history AS
SELECT
    t.transaction_id,
    t.listing_id,
    buyer.user_id AS buyer_id,
    buyer.company_name AS buyer_company,
    seller.user_id AS seller_id,
    seller.company_name AS seller_company,
    cp.project_id,
    cp.project_name,
    t.blockchain_token_id,
    t.quantity,
    t.price_per_credit,
    t.total_amount,
    t.blockchain_tx_hash,
    t.transaction_status,
    t.transaction_date
FROM transactions t
JOIN users buyer
    ON t.buyer_id = buyer.user_id

JOIN users seller
    ON t.seller_id = seller.user_id

JOIN blockchain_tokens bt
    ON t.blockchain_token_id = bt.blockchain_token_id

JOIN carbon_credits cc
    ON bt.credit_id = cc.credit_id

JOIN carbon_projects cp
    ON cc.project_id = cp.project_id;

CREATE VIEW vw_company_portfolio AS
SELECT
    company.user_id AS company_id,
    company.company_name,
    COALESCE(
        SUM(
            CASE
                WHEN t.transaction_status = 'SUCCESSFUL'
                THEN t.quantity
                ELSE 0
            END
        ),
        0
    ) AS purchased_credits,
    COALESCE(
        SUM(
            CASE
                WHEN t.transaction_status = 'SUCCESSFUL'
                THEN t.total_amount
                ELSE 0
            END
        ),
        0
    ) AS total_investment

FROM users company

LEFT JOIN transactions t
    ON company.user_id = t.buyer_id

WHERE company.role = 'COMPANY'

GROUP BY
    company.user_id,
    company.company_name;

CREATE VIEW vw_retired_credits AS
SELECT
    cr.retirement_id,
    u.user_id AS company_id,
    u.company_name,
    bt.blockchain_token_id,
    bt.on_chain_token_id,
    cp.project_id,
    cp.project_name,
    cr.quantity,
    cr.reason,
    cr.beneficiary,
    cr.blockchain_tx_hash,
    cr.retired_at

FROM credit_retirements cr
JOIN users u
    ON cr.user_id = u.user_id

JOIN blockchain_tokens bt
    ON cr.blockchain_token_id = bt.blockchain_token_id

JOIN carbon_credits cc
    ON bt.credit_id = cc.credit_id

JOIN carbon_projects cp
    ON cc.project_id = cp.project_id;

CREATE VIEW vw_market_analysis AS
SELECT
    market_data_id,
    recorded_at,
    average_price,
    demand,
    supply,
    trading_volume
FROM market_data;

CREATE VIEW vw_price_prediction AS
SELECT
    prediction_id,
    generated_at,
    target_date,
    current_price,
    predicted_price,
    model_name,
    model_version,
    confidence_score
FROM price_predictions;

CREATE VIEW vw_token_transfer_history AS
SELECT
    tt.transfer_id,
    bt.blockchain_token_id,
    bt.on_chain_token_id AS token_id,
    cp.project_id,
    cp.project_name,
    tt.from_wallet,
    tt.to_wallet,
    tt.quantity,
    tt.transaction_hash,
    tt.block_number,
    tt.transfer_type,
    tt.transferred_at

FROM token_transfers tt

JOIN blockchain_tokens bt
    ON tt.blockchain_token_id = bt.blockchain_token_id

JOIN carbon_credits cc
    ON bt.credit_id = cc.credit_id

JOIN carbon_projects cp
    ON cc.project_id = cp.project_id;

CREATE VIEW vw_company_credit_balance AS
SELECT
    ccs.company_id,
    ccs.full_name,
    ccs.company_name,
    ccs.registered_credits,
    ccs.reported_credits,
    ccs.credit_difference,

    CASE
        WHEN ccs.credit_difference >= 0
        THEN 'ELIGIBLE'
        ELSE 'BLOCKED'
    END AS project_creation_status,
    
    CASE
        WHEN ccs.credit_difference > 0
        THEN ccs.credit_difference
        ELSE 0
    END AS sellable_credits,
    
    CASE
        WHEN ccs.credit_difference < 0
        THEN ABS(ccs.credit_difference)
        ELSE 0
    END AS credits_to_purchase
FROM company_credit_summary ccs;

CREATE VIEW vw_verifier_pending_work AS
SELECT
    vn.notification_id,
    vn.project_id,
    vn.verifier_id,
    vn.notification_type,
    vn.notification_status,
    vn.created_at,
    cp.project_name,
    cp.project_type,
    cp.description,
    cp.location,
    cp.estimated_co2_reduction,
    cp.start_date,
    cp.end_date,
    company.company_name,
    company.full_name AS company_owner
FROM verification_notifications vn

JOIN carbon_projects cp
    ON vn.project_id = cp.project_id

JOIN users company
    ON cp.owner_id = company.user_id

WHERE vn.notification_status = 'PENDING';

CREATE VIEW vw_completion_reviews AS
SELECT
    vn.notification_id,
    vn.project_id,
    vn.verifier_id,
    cp.project_name,
    cp.project_type,
    cp.location,
    cp.start_date,
    cp.end_date,
    cp.estimated_co2_reduction,
    company.user_id AS company_id,
    company.company_name,
    company.full_name AS company_owner,
    vn.created_at AS notification_created_at
FROM verification_notifications vn

JOIN carbon_projects cp
    ON vn.project_id = cp.project_id

JOIN users company
    ON cp.owner_id = company.user_id
	WHERE vn.notification_type = 'COMPLETION_REVIEW' AND vn.notification_status = 'PENDING';
    
CREATE VIEW vw_price_change_requests AS
SELECT
    pcr.request_id,
    pcr.company_id,
    company.company_name,
    pcr.project_id,
    cp.project_name,
    pcr.current_price,
    pcr.requested_price,
    pcr.description,
    pcr.verifier_id,
    verifier.full_name AS verifier_name,
    pcr.status,
    pcr.requested_at,
    pcr.reviewed_at

FROM price_change_requests pcr

JOIN users company
    ON pcr.company_id = company.user_id

JOIN carbon_projects cp
    ON pcr.project_id = cp.project_id

LEFT JOIN users verifier
    ON pcr.verifier_id = verifier.user_id;

CREATE VIEW vw_admin_dashboard AS
SELECT
    (
        SELECT COUNT(*)
        FROM users
    ) AS total_users,

    (
        SELECT COUNT(*)
        FROM users
        WHERE role = 'COMPANY'
    ) AS total_companies,

    (
        SELECT COUNT(*)
        FROM users
        WHERE role = 'VERIFIER'
    ) AS total_verifiers,

    (
        SELECT COUNT(*)
        FROM carbon_projects
    ) AS total_projects,

    (
        SELECT COUNT(*)
        FROM carbon_projects
        WHERE status = 'APPROVED'
    ) AS approved_projects,

    (
        SELECT COUNT(*)
        FROM carbon_projects
        WHERE status = 'REJECTED'
    ) AS rejected_projects,

    (
        SELECT COUNT(*)
        FROM carbon_credits
    ) AS total_credit_batches,

    (
        SELECT COALESCE(SUM(quantity), 0)
        FROM carbon_credits
    ) AS total_issued_credits,

    (
        SELECT COUNT(*)
        FROM marketplace_listings
    ) AS total_listings,

    (
        SELECT COUNT(*)
        FROM transactions
    ) AS total_transactions,

    (
        SELECT COUNT(*)
        FROM verification_notifications
        WHERE notification_status = 'PENDING'
    ) AS pending_verifications,

    (
        SELECT COUNT(*)
        FROM price_change_requests
        WHERE status = 'PENDING'
    ) AS pending_price_requests,

    (
        SELECT COUNT(*)
        FROM credit_retirements
    ) AS total_retirements;

SHOW FULL TABLES
WHERE TABLE_TYPE = 'VIEW';


