DROP DATABASE IF EXISTS carbon;

CREATE DATABASE carbon;

USE carbon;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN','SELLER','BUYER') NOT NULL,
    company_name VARCHAR(150),
    wallet_address VARCHAR(42) UNIQUE,
    country VARCHAR(100),
    account_status ENUM('ACTIVE','INACTIVE','SUSPENDED')
        DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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
        'REJECTED',
        'CREDITS_ISSUED'
    ) DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_project_owner
        FOREIGN KEY(owner_id)
        REFERENCES users(user_id)
);

CREATE TABLE project_documents (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    file_url VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_document_project
        FOREIGN KEY(project_id)
        REFERENCES carbon_projects(project_id)
);

CREATE TABLE project_verifications (
    verification_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    verifier_id INT NOT NULL,
    verified_co2_reduction DECIMAL(12,2),
    status ENUM(
        'PENDING',
        'APPROVED',
        'REJECTED'
    ) DEFAULT 'PENDING',
    remarks TEXT,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_verification_project
        FOREIGN KEY(project_id)
        REFERENCES carbon_projects(project_id),
    CONSTRAINT fk_verification_admin
        FOREIGN KEY(verifier_id)
        REFERENCES users(user_id)
);

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
    CONSTRAINT fk_credit_project
        FOREIGN KEY(project_id)
        REFERENCES carbon_projects(project_id),
    CONSTRAINT fk_credit_verification
        FOREIGN KEY(verification_id)
        REFERENCES project_verifications(verification_id)
);

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
        FOREIGN KEY(credit_id)
        REFERENCES carbon_credits(credit_id)
);

CREATE TABLE marketplace_listings (
    listing_id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    blockchain_token_id INT NOT NULL,
    quantity_listed INT NOT NULL,
    quantity_available INT NOT NULL,
    price_per_credit DECIMAL(10,2) NOT NULL,
    status ENUM(
        'ACTIVE',
        'PARTIALLY_SOLD',
        'SOLD',
        'CANCELLED',
        'EXPIRED'
    ) DEFAULT 'ACTIVE',
    listed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATE,
    CONSTRAINT fk_listing_seller
        FOREIGN KEY(seller_id)
        REFERENCES users(user_id),
    CONSTRAINT fk_listing_token
        FOREIGN KEY(blockchain_token_id)
        REFERENCES blockchain_tokens(blockchain_token_id)
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
    CONSTRAINT fk_transaction_listing
        FOREIGN KEY(listing_id)
        REFERENCES marketplace_listings(listing_id),
    CONSTRAINT fk_transaction_buyer
        FOREIGN KEY(buyer_id)
        REFERENCES users(user_id),
    CONSTRAINT fk_transaction_seller
        FOREIGN KEY(seller_id)
        REFERENCES users(user_id),
    CONSTRAINT fk_transaction_token
        FOREIGN KEY(blockchain_token_id)
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
    CONSTRAINT fk_retirement_user
        FOREIGN KEY(user_id)
        REFERENCES users(user_id),
    CONSTRAINT fk_retirement_token
        FOREIGN KEY(blockchain_token_id)
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
    FOREIGN KEY (blockchain_token_id)
        REFERENCES blockchain_tokens(blockchain_token_id)
);

DESCRIBE carbon_credits;

SELECT
    project_id,
    project_name,
    estimated_co2_reduction,
    status
FROM carbon_projects
WHERE project_id = 14;

SHOW TABLES;