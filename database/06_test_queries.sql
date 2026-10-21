USE carbon;

SELECT DATABASE();

SHOW TABLES;

SELECT
    table_name,
    table_rows
FROM information_schema.tables
WHERE table_schema = 'carbon'
ORDER BY table_name;

SELECT user_id,full_name,email,role,
company_name,country,account_status FROM users ORDER BY user_id;

SELECT DISTINCT role FROM users ORDER BY role;

SELECT project_id,owner_id,
project_name,project_type,location,estimated_co2_reduction,
start_date,end_date,status FROM carbon_projects ORDER BY project_id;

SELECT company_name,COUNT(project_id) AS project_count,
SUM(estimated_co2_reduction) AS total_estimated_reduction FROM vw_company_projects
GROUP BY company_id, company_name ORDER BY total_estimated_reduction DESC;

SELECT verification_id,project_id,
verifier_id,verification_stage,verified_co2_reduction,credits_used,
status,remarks,verified_at FROM project_verifications ORDER BY verification_id;

SELECT notification_id,project_id,verifier_id,notification_type,notification_status,
created_at,completed_at FROM verification_notifications ORDER BY notification_id;

SELECT * FROM vw_verifier_pending_work ORDER BY created_at;

SELECT * FROM vw_completion_reviews ORDER BY notification_created_at;

SELECT * FROM project_completion_reports ORDER BY completion_id;

SELECT * FROM credit_usage_reports ORDER BY usage_report_id;

SELECT company_id,company_name,registered_credits,reported_credits,
credit_difference,project_creation_status,sellable_credits,
credits_to_purchase FROM vw_company_credit_balance ORDER BY company_id;

SELECT h.holding_id,h.company_id,u.company_name,h.credit_id,
cp.project_name,h.quantity_owned FROM company_credit_holdings h
JOIN users u
    ON h.company_id = u.user_id
JOIN carbon_credits cc
    ON h.credit_id = cc.credit_id
JOIN carbon_projects cp
    ON cc.project_id = cp.project_id
ORDER BY h.company_id, h.credit_id;

SELECT credit_id,project_id,verification_id,
quantity,vintage_year,issue_date,status
FROM carbon_credits ORDER BY credit_id;

SELECT * FROM vw_carbon_credit_summary ORDER BY credit_id;

SELECT blockchain_token_id,credit_id,on_chain_token_id,
blockchain_network,minted_quantity,status FROM blockchain_tokens
ORDER BY blockchain_token_id;

SELECT * FROM vw_blockchain_tokens ORDER BY blockchain_token_id;

SELECT transfer_id,blockchain_token_id,from_wallet,to_wallet,quantity,transaction_hash,
block_number,transfer_type,transferred_at FROM token_transfers ORDER BY transfer_id;

SELECT price_approval_id,project_id,verifier_id,
price_per_credit,status,approved_at FROM credit_price_approvals ORDER BY price_approval_id;

SELECT * FROM active_project_prices ORDER BY project_id;

SELECT request_id,company_id,project_id,current_price,requested_price,description,
verifier_id,status,requested_at,reviewed_at FROM price_change_requests ORDER BY request_id;

SELECT * FROM vw_price_change_requests ORDER BY request_id;

SELECT listing_id,seller_id,blockchain_token_id,quantity_listed,quantity_available,price_per_credit,
price_approval_id,status,listed_at,expires_at FROM marketplace_listings
ORDER BY listing_id;

SELECT * FROM vw_active_marketplace ORDER BY price_per_credit;

SELECT transaction_id,listing_id,buyer_id,seller_id,blockchain_token_id,
quantity,price_per_credit,total_amount,transaction_status,
transaction_date FROM transactions ORDER BY transaction_id;

SELECT * FROM vw_transaction_history ORDER BY transaction_id;

SELECT company_id,company_name,purchased_credits,total_investment
FROM vw_company_portfolio
ORDER BY total_investment DESC;

SELECT
    *
FROM vw_retired_credits
ORDER BY retired_at;

SELECT recorded_at,average_price,demand,supply,
trading_volume,demand - supply AS demand_supply_difference FROM market_data
ORDER BY recorded_at;

SELECT prediction_id,generated_at,target_date,current_price,predicted_price,
predicted_price - current_price AS predicted_change,confidence_score,model_name,model_version
FROM price_predictions
ORDER BY target_date;

SELECT COUNT(*) AS total_users FROM users;

SELECT COUNT(*) AS total_companies FROM users
WHERE role = 'COMPANY';

SELECT COUNT(*) AS total_verifiers FROM users
WHERE role = 'VERIFIER';

SELECT COUNT(*) AS total_projects FROM carbon_projects;

SELECT COALESCE(SUM(quantity), 0) AS total_credits_issued FROM carbon_credits;

SELECT COALESCE(SUM(quantity), 0) AS total_credits_retired FROM credit_retirements;

SELECT COALESCE(SUM(quantity), 0) AS total_successful_traded_credits FROM transactions
WHERE transaction_status = 'SUCCESSFUL';

SELECT COALESCE(SUM(total_amount), 0) AS total_successful_transaction_value FROM transactions
WHERE transaction_status = 'SUCCESSFUL';

SELECT project_type,COUNT(*) AS project_count,
SUM(estimated_co2_reduction) AS total_estimated_reduction FROM carbon_projects
GROUP BY project_type
ORDER BY total_estimated_reduction DESC;

SELECT project_name,estimated_co2_reduction
FROM carbon_projects
ORDER BY estimated_co2_reduction DESC
LIMIT 3;

SELECT project_name,estimated_co2_reduction,status FROM carbon_projects
WHERE status IN ('APPROVED','IN_PROGRESS','COMPLETED','CREDITS_ISSUED')
ORDER BY project_name;

SELECT project_name,estimated_co2_reduction FROM carbon_projects
WHERE estimated_co2_reduction >
(
    SELECT AVG(estimated_co2_reduction)
    FROM carbon_projects
)
ORDER BY estimated_co2_reduction DESC;

SELECT MIN(price_per_credit) AS minimum_price,MAX(price_per_credit) AS maximum_price,
AVG(price_per_credit) AS average_price FROM marketplace_listings
WHERE status IN ('ACTIVE','PARTIALLY_SOLD');

SELECT seller.company_name AS company,SUM(t.quantity) AS credits_sold,
SUM(t.total_amount) AS total_revenue FROM transactions t
JOIN users seller
    ON t.seller_id = seller.user_id
WHERE t.transaction_status = 'SUCCESSFUL'
GROUP BY seller.user_id, seller.company_name
ORDER BY total_revenue DESC;

SELECT buyer.company_name AS company,SUM(t.quantity) AS credits_purchased,
SUM(t.total_amount) AS total_spent FROM transactions t
JOIN users buyer
    ON t.buyer_id = buyer.user_id
WHERE t.transaction_status = 'SUCCESSFUL'
GROUP BY buyer.user_id, buyer.company_name
ORDER BY total_spent DESC;

SELECT cp.project_name,company.company_name,pv.verification_stage,pv.status,
pv.verified_co2_reduction,pv.credits_used,verifier.full_name AS verifier FROM carbon_projects cp

JOIN users company
    ON cp.owner_id = company.user_id
LEFT JOIN project_verifications pv
    ON cp.project_id = pv.project_id
LEFT JOIN users verifier
    ON pv.verifier_id = verifier.user_id
ORDER BY cp.project_id, pv.verification_id;

SELECT cp.project_name,company.company_name,COALESCE(SUM(cc.quantity), 0) AS issued_credits
FROM carbon_projects cp
JOIN users company
    ON cp.owner_id = company.user_id
LEFT JOIN carbon_credits cc
    ON cp.project_id = cc.project_id
GROUP BY
    cp.project_id,
    cp.project_name,
    company.company_name
ORDER BY issued_credits DESC;

SELECT *
FROM vw_admin_dashboard;

CALL sp_get_company_credit_summary(2);
CALL sp_get_company_credit_summary(3);
CALL sp_get_company_credit_summary(4);

CALL sp_create_project(
    2,
    'Temporary Test Solar Project',
    'Renewable Energy',
    'Temporary project used to test the new company project workflow.',
    'Andhra Pradesh, India',
    1500.00,
    '2027-01-01',
    '2027-12-31'
);

SET @test_project_id = LAST_INSERT_ID();

SELECT project_id,owner_id,project_name,status FROM carbon_projects
WHERE project_id = @test_project_id;

SELECT notification_type,notification_status FROM verification_notifications
WHERE project_id = @test_project_id;

DELETE FROM carbon_projects
WHERE project_id = @test_project_id;

SELECT request_id,company_id,project_id,current_price,requested_price,status 
FROM price_change_requests
WHERE status = 'PENDING';

SELECT company_name,registered_credits,reported_credits,credit_difference,
    project_creation_status,sellable_credits,credits_to_purchase
FROM vw_company_credit_balance
ORDER BY credit_difference DESC;

SHOW INDEX FROM users;
SHOW INDEX FROM carbon_projects;
SHOW INDEX FROM project_verifications;
SHOW INDEX FROM company_credit_holdings;
SHOW INDEX FROM carbon_credits;
SHOW INDEX FROM blockchain_tokens;
SHOW INDEX FROM marketplace_listings;
SHOW INDEX FROM transactions;

SHOW CREATE VIEW vw_company_credit_balance;
SHOW CREATE VIEW vw_company_projects;
SHOW CREATE VIEW vw_active_marketplace;
SHOW CREATE VIEW vw_verifier_pending_work;

SHOW CREATE PROCEDURE sp_create_project;
SHOW CREATE PROCEDURE sp_verify_project;
SHOW CREATE PROCEDURE sp_complete_project;
SHOW CREATE PROCEDURE sp_create_listing;
SHOW CREATE PROCEDURE sp_purchase_credits;
SHOW CREATE PROCEDURE sp_request_price_change;
SHOW CREATE PROCEDURE sp_review_price_change;

SHOW TRIGGERS FROM carbon;


UPDATE users
SET password_hash = '$2b$12$N.M4e53cmxfR9H2wBJBH3ewE8YpxiBQIlRKMCaY52BEXmLnPwStFq'
WHERE email = 'admin@carbon.com';



UPDATE users
SET password_hash = '$2b$12$fPDqFCoGxKJHVY8SDaqoUedE3i5Entm2tO2Gy77ymt5WtDj8B0HrG'
WHERE email = 'verifier@carbon.com';




