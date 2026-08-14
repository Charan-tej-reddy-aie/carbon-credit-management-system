USE carbon;

SELECT DATABASE();

SHOW TABLES;

SELECT
    table_name,
    table_rows
FROM information_schema.tables
WHERE table_schema = 'carbon'
ORDER BY table_name;

SELECT
    user_id,
    full_name,
    email,
    role,
    company_name,
    country,
    account_status
FROM users
ORDER BY user_id;

SELECT
    project_id,
    owner_id,
    project_name,
    project_type,
    location,
    estimated_co2_reduction,
    start_date,
    end_date,
    status
FROM carbon_projects
ORDER BY project_id;

SELECT
    credit_id,
    project_id,
    verification_id,
    quantity,
    vintage_year,
    issue_date,
    status
FROM carbon_credits
ORDER BY credit_id;

SELECT
    blockchain_token_id,
    credit_id,
    on_chain_token_id,
    blockchain_network,
    minted_quantity,
    status
FROM blockchain_tokens
ORDER BY blockchain_token_id;

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
FROM token_transfers
ORDER BY transfer_id;

SELECT
    listing_id,
    seller_id,
    blockchain_token_id,
    quantity_listed,
    quantity_available,
    price_per_credit,
    status,
    listed_at,
    expires_at
FROM marketplace_listings
ORDER BY listing_id;

SELECT
    transaction_id,
    listing_id,
    buyer_id,
    seller_id,
    blockchain_token_id,
    quantity,
    price_per_credit,
    total_amount,
    transaction_status,
    transaction_date
FROM transactions
ORDER BY transaction_id;

SELECT
    retirement_id,
    user_id,
    blockchain_token_id,
    quantity,
    reason,
    beneficiary,
    retired_at
FROM credit_retirements
ORDER BY retirement_id;

SELECT
    recorded_at,
    average_price,
    demand,
    supply,
    trading_volume,
    demand - supply AS demand_supply_difference
FROM market_data
ORDER BY recorded_at;

SELECT
    prediction_id,
    generated_at,
    target_date,
    current_price,
    predicted_price,
    model_name,
    model_version,
    confidence_score
FROM price_predictions
ORDER BY prediction_id;

SELECT DISTINCT project_type
FROM carbon_projects;

SELECT DISTINCT role
FROM users;

SELECT
    project_name,
    estimated_co2_reduction
FROM carbon_projects
WHERE estimated_co2_reduction > 3000
ORDER BY estimated_co2_reduction DESC;

SELECT
    project_name,
    project_type,
    location
FROM carbon_projects
WHERE status = 'CREDITS_ISSUED'
ORDER BY project_name;

SELECT
    project_name,
    estimated_co2_reduction
FROM carbon_projects
ORDER BY estimated_co2_reduction DESC
LIMIT 3;

SELECT
    full_name,
    company_name,
    role
FROM users
WHERE country = 'India'
ORDER BY full_name;

SELECT COUNT(*) AS total_users
FROM users;

SELECT COUNT(*) AS total_projects
FROM carbon_projects;

SELECT COUNT(*) AS total_credit_batches
FROM carbon_credits;

SELECT SUM(quantity) AS total_credits_issued
FROM carbon_credits;

SELECT AVG(price_per_credit) AS average_market_price
FROM marketplace_listings
WHERE status IN ('ACTIVE', 'PARTIALLY_SOLD');

SELECT MIN(price_per_credit) AS minimum_price,
       MAX(price_per_credit) AS maximum_price
FROM marketplace_listings;

SELECT SUM(total_amount) AS total_successful_transaction_value
FROM transactions
WHERE transaction_status = 'SUCCESSFUL';

SELECT SUM(quantity) AS total_successful_traded_credits
FROM transactions
WHERE transaction_status = 'SUCCESSFUL';

SELECT SUM(quantity) AS total_retired_credits
FROM credit_retirements;

SELECT
    u.role,
    COUNT(*) AS user_count
FROM users u
GROUP BY u.role;

SELECT
    cp.project_type,
    COUNT(*) AS project_count,
    SUM(cp.estimated_co2_reduction) AS total_estimated_reduction
FROM carbon_projects cp
GROUP BY cp.project_type
ORDER BY total_estimated_reduction DESC;

SELECT
    cp.owner_id,
    u.company_name,
    COUNT(cp.project_id) AS total_projects,
    SUM(cp.estimated_co2_reduction) AS total_estimated_reduction
FROM carbon_projects cp
JOIN users u
    ON cp.owner_id = u.user_id
GROUP BY cp.owner_id, u.company_name
ORDER BY total_estimated_reduction DESC;

SELECT
    seller_id,
    COUNT(*) AS listing_count,
    SUM(quantity_listed) AS total_listed
FROM marketplace_listings
GROUP BY seller_id
HAVING SUM(quantity_listed) > 500
ORDER BY total_listed DESC;

SELECT
    u.full_name,
    u.company_name,
    cp.project_name,
    cp.project_type,
    cp.status
FROM users u
INNER JOIN carbon_projects cp
    ON u.user_id = cp.owner_id
ORDER BY u.user_id, cp.project_id;

SELECT
    cp.project_name,
    pv.status,
    pv.verified_co2_reduction,
    u.full_name AS verifier
FROM carbon_projects cp
INNER JOIN project_verifications pv
    ON cp.project_id = pv.project_id
INNER JOIN users u
    ON pv.verifier_id = u.user_id
ORDER BY cp.project_id;

SELECT
    cc.credit_id,
    cp.project_name,
    cc.quantity,
    cc.vintage_year,
    cc.status
FROM carbon_credits cc
INNER JOIN carbon_projects cp
    ON cc.project_id = cp.project_id
ORDER BY cc.credit_id;

SELECT
    bt.blockchain_token_id,
    bt.on_chain_token_id,
    cp.project_name,
    cc.quantity,
    bt.blockchain_network,
    bt.status
FROM blockchain_tokens bt
INNER JOIN carbon_credits cc
    ON bt.credit_id = cc.credit_id
INNER JOIN carbon_projects cp
    ON cc.project_id = cp.project_id
ORDER BY bt.blockchain_token_id;

SELECT
    ml.listing_id,
    seller.company_name AS seller,
    cp.project_name,
    ml.quantity_available,
    ml.price_per_credit,
    ml.status
FROM marketplace_listings ml
INNER JOIN users seller
    ON ml.seller_id = seller.user_id
INNER JOIN blockchain_tokens bt
    ON ml.blockchain_token_id = bt.blockchain_token_id
INNER JOIN carbon_credits cc
    ON bt.credit_id = cc.credit_id
INNER JOIN carbon_projects cp
    ON cc.project_id = cp.project_id
WHERE ml.status IN ('ACTIVE', 'PARTIALLY_SOLD')
ORDER BY ml.price_per_credit;

SELECT
    t.transaction_id,
    buyer.company_name AS buyer,
    seller.company_name AS seller,
    cp.project_name,
    t.quantity,
    t.price_per_credit,
    t.total_amount,
    t.transaction_status
FROM transactions t
INNER JOIN users buyer
    ON t.buyer_id = buyer.user_id
INNER JOIN users seller
    ON t.seller_id = seller.user_id
INNER JOIN blockchain_tokens bt
    ON t.blockchain_token_id = bt.blockchain_token_id
INNER JOIN carbon_credits cc
    ON bt.credit_id = cc.credit_id
INNER JOIN carbon_projects cp
    ON cc.project_id = cp.project_id
ORDER BY t.transaction_id;

SELECT
    tt.transfer_id,
    bt.on_chain_token_id AS token_id,
    cp.project_name,
    tt.from_wallet,
    tt.to_wallet,
    tt.quantity,
    tt.transfer_type,
    tt.transaction_hash,
    tt.block_number,
    tt.transferred_at
FROM token_transfers tt
INNER JOIN blockchain_tokens bt
    ON tt.blockchain_token_id = bt.blockchain_token_id
INNER JOIN carbon_credits cc
    ON bt.credit_id = cc.credit_id
INNER JOIN carbon_projects cp
    ON cc.project_id = cp.project_id
ORDER BY tt.transferred_at;

SELECT
    cr.retirement_id,
    u.company_name,
    cp.project_name,
    cr.quantity,
    cr.reason,
    cr.beneficiary,
    cr.retired_at
FROM credit_retirements cr
INNER JOIN users u
    ON cr.user_id = u.user_id
INNER JOIN blockchain_tokens bt
    ON cr.blockchain_token_id = bt.blockchain_token_id
INNER JOIN carbon_credits cc
    ON bt.credit_id = cc.credit_id
INNER JOIN carbon_projects cp
    ON cc.project_id = cp.project_id
ORDER BY cr.retired_at;

SELECT
    project_name,
    estimated_co2_reduction
FROM carbon_projects
WHERE estimated_co2_reduction >
(
    SELECT AVG(estimated_co2_reduction)
    FROM carbon_projects
);

SELECT
    project_name,
    estimated_co2_reduction
FROM carbon_projects
WHERE project_id IN
(
    SELECT project_id
    FROM project_verifications
    WHERE status = 'APPROVED'
);

SELECT
    company_name
FROM users
WHERE user_id IN
(
    SELECT seller_id
    FROM marketplace_listings
    WHERE price_per_credit >
    (
        SELECT AVG(price_per_credit)
        FROM marketplace_listings
    )
);

SELECT
    cp.project_name,
    cc.quantity
FROM carbon_projects cp
LEFT JOIN carbon_credits cc
    ON cp.project_id = cc.project_id
ORDER BY cp.project_id;

SELECT
    u.company_name,
    COUNT(cp.project_id) AS project_count
FROM users u
LEFT JOIN carbon_projects cp
    ON u.user_id = cp.owner_id
WHERE u.role = 'SELLER'
GROUP BY u.user_id, u.company_name
ORDER BY project_count DESC;

SELECT *
FROM vw_active_marketplace;

SELECT *
FROM vw_seller_projects;

SELECT *
FROM vw_project_verification;

SELECT *
FROM vw_carbon_credit_summary;

SELECT *
FROM vw_blockchain_tokens;

SELECT *
FROM vw_transaction_history;

SELECT *
FROM vw_buyer_portfolio;

SELECT *
FROM vw_retired_credits;

SELECT *
FROM vw_market_analysis;

SELECT *
FROM vw_price_prediction;

SELECT *
FROM vw_admin_dashboard;

SELECT *
FROM vw_token_transfer_history;

SET @test_project_id = NULL;

CALL sp_create_project(
    2,
    'Test Solar Carbon Project',
    'Renewable Energy',
    'Temporary project used to test the project creation procedure.',
    'Andhra Pradesh, India',
    1500.00,
    '2026-09-01',
    '2026-12-31'
);

SET @test_project_id = LAST_INSERT_ID();

SELECT
    project_id,
    owner_id,
    project_name,
    status
FROM carbon_projects
WHERE project_id = @test_project_id;

DELETE FROM carbon_projects
WHERE project_id = @test_project_id;

START TRANSACTION;

UPDATE marketplace_listings
SET price_per_credit = price_per_credit + 10
WHERE listing_id = 1;

SELECT
    listing_id,
    price_per_credit
FROM marketplace_listings
WHERE listing_id = 1;

ROLLBACK;

SELECT
    listing_id,
    price_per_credit
FROM marketplace_listings
WHERE listing_id = 1;

START TRANSACTION;

UPDATE marketplace_listings
SET quantity_available = quantity_available - 10
WHERE listing_id = 1;

SELECT
    listing_id,
    quantity_listed,
    quantity_available,
    status
FROM marketplace_listings
WHERE listing_id = 1;

ROLLBACK;

SELECT
    listing_id,
    quantity_listed,
    quantity_available,
    status
FROM marketplace_listings
WHERE listing_id = 1;

START TRANSACTION;

SAVEPOINT before_test;

UPDATE marketplace_listings
SET price_per_credit = 9999
WHERE listing_id = 1;

SELECT
    listing_id,
    price_per_credit
FROM marketplace_listings
WHERE listing_id = 1;

ROLLBACK TO SAVEPOINT before_test;

SELECT
    listing_id,
    price_per_credit
FROM marketplace_listings
WHERE listing_id = 1;

ROLLBACK;

SELECT
    transaction_id,
    quantity,
    price_per_credit,
    total_amount
FROM transactions
ORDER BY transaction_id;

SELECT
    listing_id,
    quantity_listed,
    quantity_available,
    status
FROM marketplace_listings
ORDER BY listing_id;

SELECT
    buyer.company_name AS buyer,
    SUM(t.quantity) AS purchased_credits,
    SUM(t.total_amount) AS total_spent
FROM transactions t
INNER JOIN users buyer
    ON t.buyer_id = buyer.user_id
WHERE t.transaction_status = 'SUCCESSFUL'
GROUP BY buyer.user_id, buyer.company_name
ORDER BY total_spent DESC;

SELECT
    seller.company_name AS seller,
    SUM(t.quantity) AS credits_sold,
    SUM(t.total_amount) AS total_revenue
FROM transactions t
INNER JOIN users seller
    ON t.seller_id = seller.user_id
WHERE t.transaction_status = 'SUCCESSFUL'
GROUP BY seller.user_id, seller.company_name
ORDER BY total_revenue DESC;

SELECT
    cp.project_name,
    SUM(cc.quantity) AS total_credits
FROM carbon_projects cp
INNER JOIN carbon_credits cc
    ON cp.project_id = cc.project_id
GROUP BY cp.project_id, cp.project_name
ORDER BY total_credits DESC;

SELECT
    cp.project_name,
    SUM(cr.quantity) AS retired_credits
FROM credit_retirements cr
INNER JOIN blockchain_tokens bt
    ON cr.blockchain_token_id = bt.blockchain_token_id
INNER JOIN carbon_credits cc
    ON bt.credit_id = cc.credit_id
INNER JOIN carbon_projects cp
    ON cc.project_id = cp.project_id
GROUP BY cp.project_id, cp.project_name
ORDER BY retired_credits DESC;

SELECT
    recorded_at,
    average_price,
    demand,
    supply,
    trading_volume
FROM market_data
ORDER BY recorded_at;

SELECT
    prediction_id,
    target_date,
    current_price,
    predicted_price,
    predicted_price - current_price AS predicted_change,
    confidence_score,
    model_name
FROM price_predictions
ORDER BY target_date;

SELECT
    prediction_id,
    target_date,
    current_price,
    predicted_price,
    ROUND(
        ((predicted_price - current_price) / current_price) * 100,
        2
    ) AS predicted_percentage_change,
    confidence_score
FROM price_predictions
ORDER BY target_date;

SELECT
    COUNT(*) AS total_users
FROM users;

SELECT
    COUNT(*) AS total_projects
FROM carbon_projects;

SELECT
    COALESCE(SUM(quantity), 0) AS total_credits_issued
FROM carbon_credits;

SELECT
    COALESCE(SUM(quantity), 0) AS total_credits_retired
FROM credit_retirements;

SELECT
    COALESCE(SUM(quantity), 0) AS total_credits_traded
FROM transactions
WHERE transaction_status = 'SUCCESSFUL';

SELECT
    COALESCE(SUM(total_amount), 0) AS total_market_value
FROM transactions
WHERE transaction_status = 'SUCCESSFUL';

SELECT
    COUNT(*) AS active_listings
FROM marketplace_listings
WHERE status IN ('ACTIVE', 'PARTIALLY_SOLD');

SELECT
    COUNT(*) AS successful_transactions
FROM transactions
WHERE transaction_status = 'SUCCESSFUL';

SELECT
    COUNT(*) AS pending_transactions
FROM transactions
WHERE transaction_status = 'PENDING';

SELECT
    COUNT(*) AS failed_transactions
FROM transactions
WHERE transaction_status = 'FAILED';

SELECT
    bt.on_chain_token_id,
    cp.project_name,
    bt.minted_quantity,
    COALESCE(
        SUM(
            CASE
                WHEN tt.transfer_type = 'TRANSFER'
                THEN tt.quantity
                ELSE 0
            END
        ),
        0
    ) AS transferred_quantity
FROM blockchain_tokens bt
INNER JOIN carbon_credits cc
    ON bt.credit_id = cc.credit_id
INNER JOIN carbon_projects cp
    ON cc.project_id = cp.project_id
LEFT JOIN token_transfers tt
    ON bt.blockchain_token_id = tt.blockchain_token_id
GROUP BY
    bt.blockchain_token_id,
    bt.on_chain_token_id,
    cp.project_name,
    bt.minted_quantity
ORDER BY bt.blockchain_token_id;

SELECT
    tt.blockchain_token_id,
    SUM(
        CASE
            WHEN tt.to_wallet = u.wallet_address
            THEN tt.quantity
            ELSE 0
        END
    ) AS received_quantity,
    SUM(
        CASE
            WHEN tt.from_wallet = u.wallet_address
            THEN tt.quantity
            ELSE 0
        END
    ) AS sent_quantity
FROM token_transfers tt
CROSS JOIN users u
WHERE u.user_id IN (2,3,4,5,6,7)
GROUP BY tt.blockchain_token_id, u.user_id, u.wallet_address
HAVING received_quantity > 0
    OR sent_quantity > 0
ORDER BY tt.blockchain_token_id, u.user_id;

SELECT
    u.company_name,
    COALESCE(SUM(t.quantity), 0) AS purchased,
    COALESCE(
        (
            SELECT SUM(cr.quantity)
            FROM credit_retirements cr
            WHERE cr.user_id = u.user_id
        ),
        0
    ) AS retired
FROM users u
LEFT JOIN transactions t
    ON t.buyer_id = u.user_id
    AND t.transaction_status = 'SUCCESSFUL'
WHERE u.role = 'BUYER'
GROUP BY u.user_id, u.company_name
ORDER BY u.company_name;

EXPLAIN
SELECT
    ml.listing_id,
    ml.quantity_available,
    ml.price_per_credit
FROM marketplace_listings ml
WHERE ml.seller_id = 2
  AND ml.status = 'ACTIVE';

EXPLAIN
SELECT
    tt.transfer_id,
    tt.quantity,
    tt.transfer_type
FROM token_transfers tt
WHERE tt.blockchain_token_id = 1;

EXPLAIN
SELECT
    t.transaction_id,
    t.quantity,
    t.total_amount
FROM transactions t
WHERE t.buyer_id = 5;

SHOW INDEX FROM users;

SHOW INDEX FROM carbon_projects;

SHOW INDEX FROM blockchain_tokens;

SHOW INDEX FROM token_transfers;

SHOW INDEX FROM marketplace_listings;

SHOW INDEX FROM transactions;

SHOW INDEX FROM credit_retirements;

SHOW CREATE VIEW vw_active_marketplace;

SHOW CREATE VIEW vw_token_transfer_history;

SHOW CREATE PROCEDURE sp_purchase_credits;

SHOW CREATE PROCEDURE sp_retire_credits;

SHOW TRIGGERS FROM carbon;