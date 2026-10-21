DROP DATABASE IF EXISTS carbon;
CREATE DATABASE carbon;
USE carbon;

######### 1)users table###########

CREATE TABLE users (
user_id INT AUTO_INCREMENT PRIMARY KEY,
full_name VARCHAR(100) NOT NULL,
email VARCHAR(150) NOT NULL UNIQUE,
password_hash VARCHAR(255) NOT NULL,
role ENUM(
'ADMIN',
'COMPANY',
'VERIFIER'
) NOT NULL,
company_name VARCHAR(150),
wallet_address VARCHAR(42) UNIQUE,
country VARCHAR(100),
account_status ENUM(
'ACTIVE',
'INACTIVE',
'SUSPENDED'
) DEFAULT 'ACTIVE',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
ON UPDATE CURRENT_TIMESTAMP
);

select * from users;

#######2) carbon project table#########

CREATE TABLE carbon_projects (
project_id INT AUTO_INCREMENT PRIMARY KEY,
owner_id INT NOT NULL,
project_name VARCHAR(200) NOT NULL,
project_type VARCHAR(100) NOT NULL,
description TEXT,
location VARCHAR(200),
estimated_co2_reduction DECIMAL(12,2),
start_date DATE,
end_date DATE,
status ENUM(
'DRAFT',
'SUBMITTED',
'UNDER_REVIEW',
'APPROVED',
'IN_PROGRESS',
'COMPLETION_PENDING',
'COMPLETED',
'REJECTED',
'CREDITS_ISSUED'
) DEFAULT 'DRAFT',

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT fk_project_owner
FOREIGN KEY (owner_id)
REFERENCES users(user_id)
);

#####3) project document table###########

CREATE TABLE project_documents (
document_id INT AUTO_INCREMENT PRIMARY KEY,
project_id INT NOT NULL,
document_name VARCHAR(255) NOT NULL,
document_type VARCHAR(100) NOT NULL,
file_url VARCHAR(255) NOT NULL,
uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT fk_document_project
FOREIGN KEY (project_id)
REFERENCES carbon_projects(project_id)
ON DELETE CASCADE
);

select * from project_verifications;

####### 4)project verification##########

CREATE TABLE project_verifications (
verification_id INT AUTO_INCREMENT PRIMARY KEY,
project_id INT NOT NULL,
verifier_id INT NOT NULL,
verification_stage ENUM(
'START_APPROVAL',
'COMPLETION_REVIEW'
) NOT NULL,
verified_co2_reduction DECIMAL(12,2),
credits_used INT DEFAULT NULL,
status ENUM(
'PENDING',
'APPROVED',
'REJECTED'
) DEFAULT 'PENDING',
remarks TEXT,
verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT fk_verification_project
FOREIGN KEY (project_id)
REFERENCES carbon_projects(project_id)
ON DELETE CASCADE,
CONSTRAINT fk_verification_verifier
FOREIGN KEY (verifier_id)
REFERENCES users(user_id)
);

###########5) verifaction notifications############

CREATE TABLE verification_notifications (
notification_id INT AUTO_INCREMENT PRIMARY KEY,
project_id INT NOT NULL,
verifier_id INT NOT NULL,
notification_type ENUM(
'START_APPROVAL',
'COMPLETION_REVIEW'
) NOT NULL,
notification_status ENUM(
'PENDING',
'COMPLETED'
) DEFAULT 'PENDING',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
completed_at TIMESTAMP NULL,
CONSTRAINT fk_notification_project
FOREIGN KEY (project_id)
REFERENCES carbon_projects(project_id)
ON DELETE CASCADE,
CONSTRAINT fk_notification_verifier
FOREIGN KEY (verifier_id)
REFERENCES users(user_id)
);

###############6) project completion code##################

CREATE TABLE project_completion_reports (
completion_id INT AUTO_INCREMENT PRIMARY KEY,
project_id INT NOT NULL,
verifier_id INT NOT NULL,
credits_used INT NOT NULL,
remarks TEXT,
verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT chk_completion_credits
CHECK (credits_used >= 0),
CONSTRAINT fk_completion_project
FOREIGN KEY (project_id)
REFERENCES carbon_projects(project_id)
ON DELETE CASCADE,
CONSTRAINT fk_completion_verifier
FOREIGN KEY (verifier_id)
REFERENCES users(user_id)
);

select * from project_completion_reports;

#################7) carbon credits################################

CREATE TABLE carbon_credits (
credit_id INT AUTO_INCREMENT PRIMARY KEY,
project_id INT NOT NULL,
verification_id INT NOT NULL,
quantity INT NOT NULL,
vintage_year YEAR NOT NULL,
issue_date DATE,
status ENUM(
'ISSUED',
'TOKENIZED',
'LISTED',
'PARTIALLY_SOLD',
'SOLD',
'RETIRED'
) DEFAULT 'ISSUED',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT chk_credit_quantity
CHECK (quantity > 0),
CONSTRAINT fk_credit_project
FOREIGN KEY (project_id)
REFERENCES carbon_projects(project_id),
CONSTRAINT fk_credit_verification
FOREIGN KEY (verification_id)
REFERENCES project_verifications(verification_id)
);

select * from carbon_credits;

############# 8) company _credit_holdings#################################

CREATE TABLE company_credit_holdings (
holding_id INT AUTO_INCREMENT PRIMARY KEY,
company_id INT NOT NULL,
credit_id INT NOT NULL,
quantity_owned INT NOT NULL DEFAULT 0,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT chk_holding_quantity
CHECK (quantity_owned >= 0),
CONSTRAINT uq_company_credit
UNIQUE (company_id, credit_id),
CONSTRAINT fk_holding_company
FOREIGN KEY (company_id)
REFERENCES users(user_id),
CONSTRAINT fk_holding_credit
FOREIGN KEY (credit_id)
REFERENCES carbon_credits(credit_id)
);

select * from company_credit_holdings;

#####################9) block chain tokens#######################

CREATE TABLE blockchain_tokens (
blockchain_token_id INT AUTO_INCREMENT PRIMARY KEY,
credit_id INT NOT NULL UNIQUE,
on_chain_token_id BIGINT NOT NULL,
contract_address VARCHAR(42) NOT NULL,
blockchain_network VARCHAR(100) NOT NULL,
mint_transaction_hash VARCHAR(66) NOT NULL,
initial_owner_wallet VARCHAR(42) NOT NULL,
minted_quantity INT NOT NULL,
minted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
status ENUM(
'ACTIVE',
'TRANSFERRED',
'RETIRED'
) DEFAULT 'ACTIVE',
CONSTRAINT fk_token_credit
FOREIGN KEY (credit_id)
REFERENCES carbon_credits(credit_id)
);

##############10) credit usage reports##########################

CREATE TABLE credit_usage_reports (
usage_report_id INT AUTO_INCREMENT PRIMARY KEY,
company_id INT NOT NULL,
project_id INT NOT NULL,
completion_id INT NOT NULL,
credits_used INT NOT NULL,
reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT chk_usage_credits
CHECK (credits_used >= 0),
CONSTRAINT fk_usage_company
FOREIGN KEY (company_id)
REFERENCES users(user_id),
CONSTRAINT fk_usage_project
FOREIGN KEY (project_id)
REFERENCES carbon_projects(project_id),
CONSTRAINT fk_usage_completion
FOREIGN KEY (completion_id)
REFERENCES project_completion_reports(completion_id)
);

##############11) credit_price approval################

CREATE TABLE credit_price_approvals (
price_approval_id INT AUTO_INCREMENT PRIMARY KEY,
project_id INT NOT NULL,
verifier_id INT NOT NULL,
price_per_credit DECIMAL(10,2) NOT NULL,
status ENUM(
'ACTIVE',
'REPLACED'
) DEFAULT 'ACTIVE',
approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT chk_approved_price
CHECK (price_per_credit > 0),
CONSTRAINT fk_price_project
FOREIGN KEY (project_id)
REFERENCES carbon_projects(project_id),
CONSTRAINT fk_price_verifier
FOREIGN KEY (verifier_id)
REFERENCES users(user_id)
);

CREATE TABLE price_change_requests (
request_id INT AUTO_INCREMENT PRIMARY KEY,
company_id INT NOT NULL,
project_id INT NOT NULL,
current_price DECIMAL(10,2) NOT NULL,
requested_price DECIMAL(10,2) NOT NULL,
description TEXT NOT NULL,
verifier_id INT NULL,
status ENUM(
'PENDING',
'APPROVED',
'REJECTED'
) DEFAULT 'PENDING',
requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
reviewed_at TIMESTAMP NULL,
CONSTRAINT chk_current_price
CHECK (current_price > 0),
CONSTRAINT chk_requested_price
CHECK (requested_price > 0),
CONSTRAINT fk_price_request_company
FOREIGN KEY (company_id)
REFERENCES users(user_id),
CONSTRAINT fk_price_request_project
FOREIGN KEY (project_id)
REFERENCES carbon_projects(project_id),
CONSTRAINT fk_price_request_verifier
FOREIGN KEY (verifier_id)
REFERENCES users(user_id)
);


CREATE TABLE marketplace_listings (
listing_id INT AUTO_INCREMENT PRIMARY KEY,
seller_id INT NOT NULL,
blockchain_token_id INT NOT NULL,
quantity_listed INT NOT NULL,
quantity_available INT NOT NULL,
price_per_credit DECIMAL(10,2) NOT NULL,
price_approval_id INT NOT NULL,
status ENUM(
'ACTIVE',
'PARTIALLY_SOLD',
'SOLD',
'CANCELLED',
'EXPIRED'
) DEFAULT 'ACTIVE',
listed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
expires_at DATE,
CONSTRAINT chk_listing_quantity
CHECK (
quantity_listed > 0
AND quantity_available >= 0
AND quantity_available <= quantity_listed
),
CONSTRAINT chk_listing_price
CHECK (price_per_credit > 0),
CONSTRAINT fk_listing_seller
FOREIGN KEY (seller_id)
REFERENCES users(user_id),
CONSTRAINT fk_listing_token
FOREIGN KEY (blockchain_token_id)
REFERENCES blockchain_tokens(blockchain_token_id),
CONSTRAINT fk_listing_price_approval
FOREIGN KEY (price_approval_id)
REFERENCES credit_price_approvals(price_approval_id)
);

CREATE TABLE transactions (
transaction_id INT AUTO_INCREMENT PRIMARY KEY,
listing_id INT NOT NULL,
buyer_id INT NOT NULL,
seller_id INT NOT NULL,
blockchain_token_id INT NOT NULL,
quantity INT NOT NULL,
price_per_credit DECIMAL(10,2) NOT NULL,
total_amount DECIMAL(12,2),
blockchain_tx_hash VARCHAR(66),
transaction_status ENUM(
'PENDING',
'SUCCESSFUL',
'FAILED'
) DEFAULT 'PENDING',
transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT chk_transaction_quantity
CHECK (quantity > 0),
CONSTRAINT chk_transaction_price
CHECK (price_per_credit > 0),
CONSTRAINT fk_transaction_listing
FOREIGN KEY (listing_id)
REFERENCES marketplace_listings(listing_id),
CONSTRAINT fk_transaction_buyer
FOREIGN KEY (buyer_id)
REFERENCES users(user_id),
CONSTRAINT fk_transaction_seller        FOREIGN KEY (seller_id)
REFERENCES users(user_id),
CONSTRAINT fk_transaction_token
FOREIGN KEY (blockchain_token_id)
REFERENCES blockchain_tokens(blockchain_token_id)
);


CREATE TABLE credit_retirements (
retirement_id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT NOT NULL,
blockchain_token_id INT NOT NULL,
quantity INT NOT NULL,
reason VARCHAR(255),
beneficiary VARCHAR(255),
blockchain_tx_hash VARCHAR(66),
retired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT chk_retirement_quantity
CHECK (quantity > 0),
CONSTRAINT fk_retirement_user
FOREIGN KEY (user_id)
REFERENCES users(user_id),
CONSTRAINT fk_retirement_token
FOREIGN KEY (blockchain_token_id)
REFERENCES blockchain_tokens(blockchain_token_id)
);

CREATE TABLE market_data (
market_data_id INT AUTO_INCREMENT PRIMARY KEY,
recorded_at DATE,
average_price DECIMAL(10,2),
demand INT,
supply INT,
trading_volume INT
);


CREATE TABLE price_predictions (
prediction_id INT AUTO_INCREMENT PRIMARY KEY,
generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
target_date DATE NOT NULL,
current_price DECIMAL(10,2),
predicted_price DECIMAL(10,2),
model_name VARCHAR(100),
model_version VARCHAR(50),
confidence_score DECIMAL(5,2)
);

CREATE TABLE token_transfers (
    transfer_id INT AUTO_INCREMENT PRIMARY KEY,
    blockchain_token_id INT NOT NULL,
    from_wallet VARCHAR(42) NOT NULL,
    to_wallet VARCHAR(42) NOT NULL,
    quantity INT NOT NULL,
transaction_hash VARCHAR(66) NOT NULL,
block_number BIGINT,
transfer_type ENUM(
'MINT',
'TRANSFER'
) NOT NULL,
transferred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT chk_transfer_quantity
CHECK (quantity > 0),
CONSTRAINT fk_transfer_token
FOREIGN KEY (blockchain_token_id)
REFERENCES blockchain_tokens(blockchain_token_id)
);


CREATE INDEX idx_users_role
    ON users(role);

CREATE INDEX idx_users_company
    ON users(company_name);

CREATE INDEX idx_project_owner
    ON carbon_projects(owner_id);

CREATE INDEX idx_project_status
    ON carbon_projects(status);

CREATE INDEX idx_project_dates
    ON carbon_projects(start_date, end_date);

CREATE INDEX idx_verification_project
    ON project_verifications(project_id);

CREATE INDEX idx_verification_verifier
    ON project_verifications(verifier_id);

CREATE INDEX idx_verification_stage
    ON project_verifications(verification_stage);

CREATE INDEX idx_notification_verifier
    ON verification_notifications(verifier_id);

CREATE INDEX idx_notification_status
    ON verification_notifications(notification_status);

CREATE INDEX idx_completion_project
    ON project_completion_reports(project_id);

CREATE INDEX idx_holding_company
    ON company_credit_holdings(company_id);

CREATE INDEX idx_holding_credit
    ON company_credit_holdings(credit_id);

CREATE INDEX idx_usage_company
    ON credit_usage_reports(company_id);

CREATE INDEX idx_usage_project
    ON credit_usage_reports(project_id);

CREATE INDEX idx_price_project
    ON credit_price_approvals(project_id);

CREATE INDEX idx_price_request_company
    ON price_change_requests(company_id);

CREATE INDEX idx_price_request_status
    ON price_change_requests(status);

CREATE INDEX idx_listing_seller
    ON marketplace_listings(seller_id);

CREATE INDEX idx_listing_status
    ON marketplace_listings(status);

CREATE INDEX idx_transaction_buyer
    ON transactions(buyer_id);

CREATE INDEX idx_transaction_seller
    ON transactions(seller_id);

CREATE INDEX idx_transaction_status
    ON transactions(transaction_status);

CREATE VIEW company_credit_summary AS
SELECT
u.user_id AS company_id,
u.full_name,
u.company_name,
COALESCE(
SUM(h.quantity_owned),
0
) AS registered_credits,
COALESCE(
(
SELECT SUM(cur.credits_used)
FROM credit_usage_reports cur
WHERE cur.company_id = u.user_id
),
0
) AS reported_credits,
(
COALESCE(
SUM(h.quantity_owned),
0
)-
COALESCE(
(SELECT SUM(cur.credits_used)
FROM credit_usage_reports cur
WHERE cur.company_id = u.user_id
),
0
)
) AS credit_difference
FROM users u
LEFT JOIN company_credit_holdings h
ON h.company_id = u.user_id
WHERE u.role = 'COMPANY'
GROUP BY
u.user_id,
u.full_name,
u.company_name;

CREATE VIEW company_project_eligibility AS
SELECT
company_id,
full_name,
company_name,
registered_credits,
reported_credits,
credit_difference,
CASE
WHEN credit_difference >= 0
THEN 'ELIGIBLE'
ELSE 'BLOCKED'
END AS project_creation_status,
CASE
WHEN credit_difference > 0
THEN credit_difference
ELSE 0
END AS credits_available_for_sale
FROM company_credit_summary;
CREATE VIEW verifier_pending_work AS
SELECT
vn.notification_id,
vn.project_id,
vn.verifier_id,
vn.notification_type,
vn.notification_status,
vn.created_at,
cp.project_name,
cp.project_type,
cp.owner_id,
u.company_name,
u.full_name AS company_owner,
cp.start_date,
cp.end_date,
cp.estimated_co2_reduction
FROM verification_notifications vn
JOIN carbon_projects cp
ON cp.project_id = vn.project_id
JOIN users u
ON u.user_id = cp.owner_id
WHERE vn.notification_status = 'PENDING';

CREATE VIEW active_project_prices AS
SELECT
    cpa.price_approval_id,
    cpa.project_id,
    cpa.verifier_id,
    cpa.price_per_credit,
    cpa.approved_at,
    cp.project_name,
    cp.owner_id AS company_id
FROM credit_price_approvals cpa
JOIN carbon_projects cp
    ON cp.project_id = cpa.project_id
WHERE cpa.status = 'ACTIVE';


UPDATE users
SET password_hash = '$2b$12$0b9.VdLrb4tDUDqGcDjt5egly0/A1SlUbCOrHutFEb7sHUWl9AORi'
WHERE email = 'admin@carbon.com'
  AND role = 'ADMIN';
  
SELECT
    user_id,
    email,
    role,
    password_hash
FROM users
WHERE email = 'admin@carbon.com';

UPDATE users
SET password_hash = '$2b$12$qsuJ/0qWISTqS0j3pWRwe.VA31/tKfLbMbQHSuMnY63QC0S9xGFVu'
WHERE email = 'priya@ecoforest.com';

UPDATE users
SET password_hash = '$2b$12$qsuJ/0qWISTqS0j3pWRwe.VA31/tKfLbMbQHSuMnY63QC0S9xGFVu'
WHERE email = 'rahul@windenergy.com';

UPDATE users
SET password_hash = '$2b$12$qsuJ/0qWISTqS0j3pWRwe.VA31/tKfLbMbQHSuMnY63QC0S9xGFVu'
WHERE email = 'meera@meeraindustries.com';

UPDATE users
SET password_hash = 'PASTE_COMPANY_HASH_HERE'
WHERE email = 'buyer@globalmanufacturing.com';

UPDATE users
SET password_hash = 'PASTE_COMPANY_HASH_HERE'
WHERE email = 'futuretech@carbon.com';


UPDATE users
SET password_hash = '$2b$12$3QMIWQRYNVfD1nHsFcHboeyWfuIEV97oLFaTtGHUuCG1RX3Ol9jcu'
WHERE email = 'verifier@carbon.com';

SHOW TABLES;


select * from users;