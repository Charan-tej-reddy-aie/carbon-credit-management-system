DROP DATABASE IF EXISTS carbon_v2;
CREATE DATABASE carbon_v2;
USE carbon_v2;

-- ============================================================
-- 1. ROLES
-- ============================================================
CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(30) NOT NULL UNIQUE
);

INSERT INTO roles (role_name) VALUES
('ADMIN'),
('COMPANY'),
('VERIFIER');

-- ============================================================
-- 2. USERS
-- ============================================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    wallet_address VARCHAR(42) UNIQUE,
    country VARCHAR(100),
    account_status ENUM('ACTIVE','INACTIVE','SUSPENDED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- ============================================================
-- 3. COMPANIES
-- One user account represents one company account.
-- ============================================================
CREATE TABLE companies (
    company_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    company_name VARCHAR(150) NOT NULL UNIQUE,
    CONSTRAINT fk_companies_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- ============================================================
-- 4. PROJECT TYPES
-- ============================================================
CREATE TABLE project_types (
    project_type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255)
);

-- ============================================================
-- 5. CARBON PROJECTS
-- ============================================================
CREATE TABLE carbon_projects (
    project_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_company_id INT NOT NULL,
    project_type_id INT NOT NULL,
    project_name VARCHAR(200) NOT NULL,
    description TEXT,
    location VARCHAR(200),
    estimated_co2_reduction DECIMAL(12,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_project_co2 CHECK (estimated_co2_reduction > 0),
    CONSTRAINT chk_project_dates CHECK (end_date > start_date),
    CONSTRAINT fk_project_company
        FOREIGN KEY (owner_company_id) REFERENCES companies(company_id),
    CONSTRAINT fk_project_type
        FOREIGN KEY (project_type_id) REFERENCES project_types(project_type_id)
);

-- ============================================================
-- 6. PROJECT DOCUMENTS
-- ============================================================
CREATE TABLE project_documents (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    file_url VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_document_project
        FOREIGN KEY (project_id) REFERENCES carbon_projects(project_id)
        ON DELETE CASCADE
);

-- ============================================================
-- 7. PROJECT VERIFICATIONS
-- ============================================================
CREATE TABLE project_verifications (
    verification_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    verifier_id INT NOT NULL,
    verification_stage ENUM('START_APPROVAL','COMPLETION_REVIEW') NOT NULL,
    verified_co2_reduction DECIMAL(12,2),
    credits_used INT,
    status ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
    remarks TEXT,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_verified_co2 CHECK (
        verified_co2_reduction IS NULL OR verified_co2_reduction >= 0
    ),
    CONSTRAINT chk_verification_credits CHECK (
        credits_used IS NULL OR credits_used >= 0
    ),
    CONSTRAINT fk_verification_project
        FOREIGN KEY (project_id) REFERENCES carbon_projects(project_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_verification_verifier
        FOREIGN KEY (verifier_id) REFERENCES users(user_id)
);

-- ============================================================
-- 8. VERIFICATION NOTIFICATIONS
-- ============================================================
CREATE TABLE verification_notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    verifier_id INT NOT NULL,
    notification_type ENUM('START_APPROVAL','COMPLETION_REVIEW') NOT NULL,
    notification_status ENUM('PENDING','COMPLETED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    CONSTRAINT fk_notification_project
        FOREIGN KEY (project_id) REFERENCES carbon_projects(project_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notification_verifier
        FOREIGN KEY (verifier_id) REFERENCES users(user_id)
);

-- ============================================================
-- 9. PROJECT COMPLETION REPORTS
-- ============================================================
CREATE TABLE project_completion_reports (
    completion_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    verifier_id INT NOT NULL,
    credits_used INT NOT NULL,
    remarks TEXT,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_completion_credits CHECK (credits_used >= 0),
    CONSTRAINT fk_completion_project
        FOREIGN KEY (project_id) REFERENCES carbon_projects(project_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_completion_verifier
        FOREIGN KEY (verifier_id) REFERENCES users(user_id)
);

-- ============================================================
-- 10. CARBON CREDITS
-- project_id is intentionally removed.
-- Project is obtained through verification_id -> project_id.
-- ============================================================
CREATE TABLE carbon_credits (
    credit_id INT AUTO_INCREMENT PRIMARY KEY,
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
    CONSTRAINT chk_credit_quantity CHECK (quantity > 0),
    CONSTRAINT fk_credit_verification
        FOREIGN KEY (verification_id) REFERENCES project_verifications(verification_id)
);

-- ============================================================
-- 11. COMPANY CREDIT HOLDINGS
-- ============================================================
CREATE TABLE company_credit_holdings (
    holding_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    credit_id INT NOT NULL,
    quantity_owned INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_holding_quantity CHECK (quantity_owned >= 0),
    CONSTRAINT uq_company_credit UNIQUE (company_id, credit_id),
    CONSTRAINT fk_holding_company
        FOREIGN KEY (company_id) REFERENCES companies(company_id),
    CONSTRAINT fk_holding_credit
        FOREIGN KEY (credit_id) REFERENCES carbon_credits(credit_id)
);

-- ============================================================
-- 12. BLOCKCHAIN TOKENS
-- ============================================================
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
    status ENUM('ACTIVE','TRANSFERRED','RETIRED') DEFAULT 'ACTIVE',
    CONSTRAINT chk_minted_quantity CHECK (minted_quantity > 0),
    CONSTRAINT fk_token_credit
        FOREIGN KEY (credit_id) REFERENCES carbon_credits(credit_id)
);

-- ============================================================
-- 13. TOKEN TRANSFERS
-- ============================================================
CREATE TABLE token_transfers (
    transfer_id INT AUTO_INCREMENT PRIMARY KEY,
    blockchain_token_id INT NOT NULL,
    from_wallet VARCHAR(42) NOT NULL,
    to_wallet VARCHAR(42) NOT NULL,
    quantity INT NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT,
    transfer_type ENUM('MINT','TRANSFER') NOT NULL,
    transferred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_transfer_quantity CHECK (quantity > 0),
    CONSTRAINT fk_transfer_token
        FOREIGN KEY (blockchain_token_id) REFERENCES blockchain_tokens(blockchain_token_id)
);

-- ============================================================
-- 14. CREDIT USAGE REPORTS
-- project_id/company_id are removed because they are derivable:
-- completion_id -> project_id -> owner_company_id.
-- ============================================================
CREATE TABLE credit_usage_reports (
    usage_report_id INT AUTO_INCREMENT PRIMARY KEY,
    completion_id INT NOT NULL,
    credits_used INT NOT NULL,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_usage_credits CHECK (credits_used >= 0),
    CONSTRAINT fk_usage_completion
        FOREIGN KEY (completion_id) REFERENCES project_completion_reports(completion_id)
);

-- ============================================================
-- 15. CREDIT PRICE APPROVALS
-- ============================================================
CREATE TABLE credit_price_approvals (
    price_approval_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    verifier_id INT NOT NULL,
    price_per_credit DECIMAL(10,2) NOT NULL,
    status ENUM('ACTIVE','REPLACED') DEFAULT 'ACTIVE',
    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_approved_price CHECK (price_per_credit > 0),
    CONSTRAINT fk_price_project
        FOREIGN KEY (project_id) REFERENCES carbon_projects(project_id),
    CONSTRAINT fk_price_verifier
        FOREIGN KEY (verifier_id) REFERENCES users(user_id)
);

-- ============================================================
-- 16. PRICE CHANGE REQUESTS
-- company_id/current_price are intentionally not stored:
-- company is obtained from project owner and current price from approvals.
-- ============================================================
CREATE TABLE price_change_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    requested_price DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    verifier_id INT NULL,
    status ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    CONSTRAINT chk_requested_price CHECK (requested_price > 0),
    CONSTRAINT fk_price_request_project
        FOREIGN KEY (project_id) REFERENCES carbon_projects(project_id),
    CONSTRAINT fk_price_request_verifier
        FOREIGN KEY (verifier_id) REFERENCES users(user_id)
);

-- ============================================================
-- 17. MARKETPLACE LISTINGS
-- price_per_credit is obtained from price_approval_id.
-- ============================================================
CREATE TABLE marketplace_listings (
    listing_id INT AUTO_INCREMENT PRIMARY KEY,
    seller_company_id INT NOT NULL,
    blockchain_token_id INT NOT NULL,
    quantity_listed INT NOT NULL,
    quantity_available INT NOT NULL,
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
    CONSTRAINT chk_listing_quantity CHECK (
        quantity_listed > 0
        AND quantity_available >= 0
        AND quantity_available <= quantity_listed
    ),
    CONSTRAINT fk_listing_seller_company
        FOREIGN KEY (seller_company_id) REFERENCES companies(company_id),
    CONSTRAINT fk_listing_token
        FOREIGN KEY (blockchain_token_id) REFERENCES blockchain_tokens(blockchain_token_id),
    CONSTRAINT fk_listing_price_approval
        FOREIGN KEY (price_approval_id) REFERENCES credit_price_approvals(price_approval_id)
);

-- ============================================================
-- 18. TRANSACTIONS
-- Seller/token are derived from listing; historical price is retained
-- intentionally as a financial snapshot.
-- ============================================================
CREATE TABLE transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    listing_id INT NOT NULL,
    buyer_company_id INT NOT NULL,
    quantity INT NOT NULL,
    price_per_credit DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    blockchain_tx_hash VARCHAR(66),
    transaction_status ENUM('PENDING','SUCCESSFUL','FAILED') DEFAULT 'PENDING',
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_transaction_quantity CHECK (quantity > 0),
    CONSTRAINT chk_transaction_price CHECK (price_per_credit > 0),
    CONSTRAINT chk_transaction_total CHECK (total_amount >= 0),
    CONSTRAINT fk_transaction_listing
        FOREIGN KEY (listing_id) REFERENCES marketplace_listings(listing_id),
    CONSTRAINT fk_transaction_buyer_company
        FOREIGN KEY (buyer_company_id) REFERENCES companies(company_id)
);

-- ============================================================
-- 19. CREDIT RETIREMENTS
-- ============================================================
CREATE TABLE credit_retirements (
    retirement_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    blockchain_token_id INT NOT NULL,
    quantity INT NOT NULL,
    reason VARCHAR(255),
    beneficiary VARCHAR(255),
    blockchain_tx_hash VARCHAR(66),
    retired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_retirement_quantity CHECK (quantity > 0),
    CONSTRAINT fk_retirement_company
        FOREIGN KEY (company_id) REFERENCES companies(company_id),
    CONSTRAINT fk_retirement_token
        FOREIGN KEY (blockchain_token_id) REFERENCES blockchain_tokens(blockchain_token_id)
);

-- ============================================================
-- 20. MARKET DATA
-- ============================================================
CREATE TABLE market_data (
    market_data_id INT AUTO_INCREMENT PRIMARY KEY,
    recorded_at DATE NOT NULL,
    average_price DECIMAL(10,2) NOT NULL,
    demand INT NOT NULL,
    supply INT NOT NULL,
    trading_volume INT NOT NULL,
    CONSTRAINT chk_market_average_price CHECK (average_price >= 0),
    CONSTRAINT chk_market_demand CHECK (demand >= 0),
    CONSTRAINT chk_market_supply CHECK (supply >= 0),
    CONSTRAINT chk_market_volume CHECK (trading_volume >= 0)
);

-- ============================================================
-- 21. PRICE PREDICTIONS
-- ============================================================
CREATE TABLE price_predictions (
    prediction_id INT AUTO_INCREMENT PRIMARY KEY,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    target_date DATE NOT NULL,
    current_price DECIMAL(10,2) NOT NULL,
    predicted_price DECIMAL(10,2) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50),
    confidence_score DECIMAL(5,2),
    CONSTRAINT chk_prediction_current_price CHECK (current_price >= 0),
    CONSTRAINT chk_prediction_predicted_price CHECK (predicted_price >= 0),
    CONSTRAINT chk_prediction_confidence CHECK (
        confidence_score IS NULL OR confidence_score BETWEEN 0 AND 100
    )
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_company_user ON companies(user_id);
CREATE INDEX idx_project_owner ON carbon_projects(owner_company_id);
CREATE INDEX idx_project_type ON carbon_projects(project_type_id);
CREATE INDEX idx_project_status ON carbon_projects(status);
CREATE INDEX idx_project_dates ON carbon_projects(start_date, end_date);
CREATE INDEX idx_document_project ON project_documents(project_id);
CREATE INDEX idx_verification_project ON project_verifications(project_id);
CREATE INDEX idx_verification_verifier ON project_verifications(verifier_id);
CREATE INDEX idx_verification_stage ON project_verifications(verification_stage);
CREATE INDEX idx_notification_verifier ON verification_notifications(verifier_id);
CREATE INDEX idx_notification_status ON verification_notifications(notification_status);
CREATE INDEX idx_completion_project ON project_completion_reports(project_id);
CREATE INDEX idx_completion_verifier ON project_completion_reports(verifier_id);
CREATE INDEX idx_holding_company ON company_credit_holdings(company_id);
CREATE INDEX idx_holding_credit ON company_credit_holdings(credit_id);
CREATE INDEX idx_usage_completion ON credit_usage_reports(completion_id);
CREATE INDEX idx_price_project ON credit_price_approvals(project_id);
CREATE INDEX idx_price_request_project ON price_change_requests(project_id);
CREATE INDEX idx_price_request_status ON price_change_requests(status);
CREATE INDEX idx_listing_seller ON marketplace_listings(seller_company_id);
CREATE INDEX idx_listing_token ON marketplace_listings(blockchain_token_id);
CREATE INDEX idx_listing_status ON marketplace_listings(status);
CREATE INDEX idx_listing_price_approval ON marketplace_listings(price_approval_id);
CREATE INDEX idx_transaction_buyer ON transactions(buyer_company_id);
CREATE INDEX idx_transaction_listing ON transactions(listing_id);
CREATE INDEX idx_transaction_date ON transactions(transaction_date);
CREATE INDEX idx_transaction_status ON transactions(transaction_status);
CREATE INDEX idx_retirement_company ON credit_retirements(company_id);
CREATE INDEX idx_retirement_token ON credit_retirements(blockchain_token_id);
CREATE INDEX idx_retirement_date ON credit_retirements(retired_at);
CREATE INDEX idx_market_date ON market_data(recorded_at);
CREATE INDEX idx_prediction_target ON price_predictions(target_date);
CREATE INDEX idx_prediction_generated ON price_predictions(generated_at);
CREATE INDEX idx_transfer_token ON token_transfers(blockchain_token_id);
CREATE INDEX idx_transfer_hash ON token_transfers(transaction_hash);
CREATE INDEX idx_transfer_date ON token_transfers(transferred_at);

SHOW TABLES;