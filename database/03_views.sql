USE carbon;

DROP VIEW IF EXISTS vw_active_marketplace;
DROP VIEW IF EXISTS vw_seller_projects;
DROP VIEW IF EXISTS vw_project_verification;
DROP VIEW IF EXISTS vw_carbon_credit_summary;
DROP VIEW IF EXISTS vw_blockchain_tokens;
DROP VIEW IF EXISTS vw_transaction_history;
DROP VIEW IF EXISTS vw_buyer_portfolio;
DROP VIEW IF EXISTS vw_retired_credits;
DROP VIEW IF EXISTS vw_market_analysis;
DROP VIEW IF EXISTS vw_price_prediction;
DROP VIEW IF EXISTS vw_admin_dashboard;

CREATE VIEW vw_active_marketplace AS
SELECT
    ml.listing_id,
    cp.project_name,
    u.company_name AS seller,
    ml.quantity_available,
    ml.price_per_credit,
    ml.status,
    ml.listed_at

FROM marketplace_listings ml

JOIN users u
ON ml.seller_id = u.user_id

JOIN blockchain_tokens bt
ON ml.blockchain_token_id = bt.blockchain_token_id

JOIN carbon_credits cc
ON bt.credit_id = cc.credit_id

JOIN carbon_projects cp
ON cc.project_id = cp.project_id

WHERE ml.status IN ('ACTIVE','PARTIALLY_SOLD');

CREATE VIEW vw_seller_projects AS
SELECT
    u.user_id,
    u.company_name,
    cp.project_id,
    cp.project_name,
    cp.project_type,
    cp.status,
    cp.estimated_co2_reduction,
    cp.created_at
FROM users u
JOIN carbon_projects cp
ON u.user_id = cp.owner_id;

CREATE VIEW vw_project_verification AS
SELECT
    cp.project_id,
    cp.project_name,
    u.company_name,
    pv.verified_co2_reduction,
    pv.status,
    pv.verified_at
FROM project_verifications pv
JOIN carbon_projects cp
ON pv.project_id = cp.project_id
JOIN users u
ON cp.owner_id = u.user_id;

CREATE VIEW vw_carbon_credit_summary AS
SELECT
    cc.credit_id,
    cp.project_name,
    cc.quantity,
    cc.vintage_year,
    cc.status,
    cc.issue_date
FROM carbon_credits cc
JOIN carbon_projects cp
ON cc.project_id = cp.project_id;

CREATE VIEW vw_blockchain_tokens AS
SELECT
    bt.blockchain_token_id,
    bt.on_chain_token_id,
    bt.contract_address,
    bt.blockchain_network,
    bt.minted_quantity,
    bt.status,
    cp.project_name
FROM blockchain_tokens bt
JOIN carbon_credits cc
ON bt.credit_id = cc.credit_id
JOIN carbon_projects cp
ON cc.project_id = cp.project_id;

CREATE VIEW vw_transaction_history AS
SELECT
    t.transaction_id,
    buyer.company_name AS buyer,
    seller.company_name AS seller,
    cp.project_name,
    t.quantity,
    t.price_per_credit,
    t.total_amount,
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

CREATE VIEW vw_buyer_portfolio AS
SELECT
    buyer.user_id,
    buyer.company_name,
    SUM(t.quantity) AS total_credits,
    SUM(t.total_amount) AS investment
FROM transactions t
JOIN users buyer
ON t.buyer_id = buyer.user_id
WHERE t.transaction_status='SUCCESSFUL'
GROUP BY buyer.user_id,buyer.company_name;

CREATE VIEW vw_retired_credits AS
SELECT
    cr.retirement_id,
    u.company_name,
    cr.quantity,
    cr.reason,
    cr.retired_at
FROM credit_retirements cr
JOIN users u
ON cr.user_id=u.user_id;
CREATE VIEW vw_market_analysis AS
SELECT
    recorded_at,
    average_price,
    demand,
    supply,
    trading_volume
FROM market_data
ORDER BY recorded_at;

CREATE VIEW vw_price_prediction AS
SELECT
    prediction_id,
    generated_at,
    target_date,
    current_price,
    predicted_price,
    model_name,
    confidence_score
FROM price_predictions;

CREATE VIEW vw_token_transfer_history AS
SELECT
    tt.transfer_id,
    bt.on_chain_token_id AS token_id,
    cp.project_name AS project_name,
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

CREATE VIEW vw_admin_dashboard AS
SELECT
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM carbon_projects) AS total_projects,
    (SELECT COUNT(*) FROM carbon_credits) AS total_credit_batches,
    (SELECT COUNT(*) FROM marketplace_listings) AS total_listings,
    (SELECT COUNT(*) FROM transactions) AS total_transactions,
    (SELECT COUNT(*) FROM credit_retirements) AS total_retirements;
    
SHOW FULL TABLES
WHERE TABLE_TYPE='VIEW';