USE carbon;

ALTER TABLE users
MODIFY updated_at
TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE users
MODIFY role
ENUM('ADMIN','SELLER','BUYER','VERIFIER') NOT NULL;

ALTER TABLE carbon_projects
ADD CONSTRAINT chk_estimated_co2
CHECK (estimated_co2_reduction >= 0);

ALTER TABLE carbon_projects
MODIFY updated_at
TIMESTAMP DEFAULT CURRENT_TIMESTAMP
ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE carbon_projects
ADD CONSTRAINT chk_project_dates
CHECK (
    end_date IS NULL
    OR
    start_date IS NULL
    OR
    end_date >= start_date
);
ALTER TABLE carbon_credits
ADD CONSTRAINT chk_credit_quantity
CHECK (quantity > 0);

ALTER TABLE carbon_credits
ADD CONSTRAINT chk_credit_year
CHECK (vintage_year >= 2000);

ALTER TABLE blockchain_tokens
ADD CONSTRAINT chk_minted_quantity
CHECK (minted_quantity > 0);

ALTER TABLE blockchain_tokens
ADD CONSTRAINT uq_chain_contract_token
UNIQUE (
    blockchain_network,
    contract_address,
    on_chain_token_id
);

ALTER TABLE blockchain_tokens
MODIFY on_chain_token_id BIGINT NOT NULL;

ALTER TABLE marketplace_listings
ADD CONSTRAINT chk_quantity_listed
CHECK (quantity_listed > 0);

ALTER TABLE marketplace_listings
ADD CONSTRAINT chk_quantity_available
CHECK (quantity_available >= 0);

ALTER TABLE marketplace_listings
ADD CONSTRAINT chk_listing_price
CHECK (price_per_credit > 0);

ALTER TABLE transactions
ADD CONSTRAINT chk_transaction_quantity
CHECK (quantity > 0);

ALTER TABLE transactions
ADD CONSTRAINT chk_transaction_price
CHECK (price_per_credit > 0);

ALTER TABLE transactions
ADD CONSTRAINT chk_transaction_total
CHECK (total_amount >= 0);

ALTER TABLE token_transfers
ADD CONSTRAINT chk_transfer_quantity
CHECK (quantity > 0);

ALTER TABLE token_transfers
ADD CONSTRAINT chk_transfer_wallets
CHECK (from_wallet <> to_wallet);

ALTER TABLE token_transfers
ADD CONSTRAINT uq_transfer_hash
UNIQUE (transaction_hash);

ALTER TABLE credit_retirements
ADD CONSTRAINT chk_retirement_quantity
CHECK (quantity > 0);

ALTER TABLE market_data
ADD CONSTRAINT chk_average_price
CHECK (average_price >= 0);

ALTER TABLE market_data
ADD CONSTRAINT chk_market_demand
CHECK (demand >= 0);

ALTER TABLE market_data
ADD CONSTRAINT chk_market_supply
CHECK (supply >= 0);

ALTER TABLE market_data
ADD CONSTRAINT chk_market_volume
CHECK (trading_volume >= 0);

ALTER TABLE price_predictions
ADD CONSTRAINT chk_current_price
CHECK (current_price >= 0);

ALTER TABLE price_predictions
ADD CONSTRAINT chk_predicted_price
CHECK (predicted_price >= 0);

ALTER TABLE price_predictions
ADD CONSTRAINT chk_prediction_dates
CHECK (target_date >= DATE(generated_at));

ALTER TABLE price_predictions
ADD CONSTRAINT chk_confidence
CHECK (
    confidence_score >= 0
    AND
    confidence_score <= 100
);

CREATE INDEX idx_user_email
ON users(email);

CREATE INDEX idx_user_role
ON users(role);

CREATE INDEX idx_user_wallet
ON users(wallet_address);

CREATE INDEX idx_project_owner
ON carbon_projects(owner_id);

CREATE INDEX idx_project_status
ON carbon_projects(status);

CREATE INDEX idx_project_type
ON carbon_projects(project_type);

CREATE INDEX idx_document_project
ON project_documents(project_id);

CREATE INDEX idx_verification_project
ON project_verifications(project_id);

CREATE INDEX idx_verification_admin
ON project_verifications(verifier_id);

CREATE INDEX idx_verification_status
ON project_verifications(status);

CREATE INDEX idx_credit_project
ON carbon_credits(project_id);

CREATE INDEX idx_credit_status
ON carbon_credits(status);

CREATE INDEX idx_credit_year
ON carbon_credits(vintage_year);

CREATE INDEX idx_token_credit
ON blockchain_tokens(credit_id);

CREATE INDEX idx_token_network
ON blockchain_tokens(blockchain_network);

CREATE INDEX idx_token_status
ON blockchain_tokens(status);

CREATE INDEX idx_listing_seller
ON marketplace_listings(seller_id);

CREATE INDEX idx_listing_status
ON marketplace_listings(status);

CREATE INDEX idx_listing_price
ON marketplace_listings(price_per_credit);

CREATE INDEX idx_transaction_buyer
ON transactions(buyer_id);

CREATE INDEX idx_transaction_seller
ON transactions(seller_id);

CREATE INDEX idx_transaction_listing
ON transactions(listing_id);

CREATE INDEX idx_transaction_date
ON transactions(transaction_date);

CREATE INDEX idx_transaction_status
ON transactions(transaction_status);

CREATE INDEX idx_retirement_user
ON credit_retirements(user_id);

CREATE INDEX idx_retirement_date
ON credit_retirements(retired_at);

CREATE INDEX idx_market_date
ON market_data(recorded_at);

CREATE INDEX idx_prediction_target
ON price_predictions(target_date);

CREATE INDEX idx_prediction_generated
ON price_predictions(generated_at);

CREATE INDEX idx_transfer_token
ON token_transfers(blockchain_token_id);

CREATE INDEX idx_transfer_from_wallet
ON token_transfers(from_wallet);

CREATE INDEX idx_transfer_to_wallet
ON token_transfers(to_wallet);

CREATE INDEX idx_transfer_hash
ON token_transfers(transaction_hash);

CREATE INDEX idx_transfer_date
ON token_transfers(transferred_at);

SHOW INDEX FROM users;
SHOW INDEX FROM carbon_projects;
SHOW INDEX FROM transactions;