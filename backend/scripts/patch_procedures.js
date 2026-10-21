const { pool } = require("../src/config/database");

async function run() {
    console.log("Dropping and recreating sp_purchase_credits...");
    await pool.query("DROP PROCEDURE IF EXISTS sp_purchase_credits");
    await pool.query(`
CREATE PROCEDURE sp_purchase_credits(
    IN p_listing_id INT,
    IN p_buyer_user_id INT,
    IN p_quantity INT,
    IN p_blockchain_tx_hash VARCHAR(66)
)
BEGIN
    DECLARE v_buyer_company_id INT;
    DECLARE v_buyer_role VARCHAR(30);
    DECLARE v_buyer_wallet VARCHAR(42);
    DECLARE v_listing_status VARCHAR(30);
    DECLARE v_available INT;
    DECLARE v_price DECIMAL(10,2);
    DECLARE v_seller_company_id INT;
    DECLARE v_token_id INT;
    DECLARE v_credit_id INT;
    DECLARE v_seller_wallet VARCHAR(42);
    DECLARE v_total DECIMAL(12,2);
    DECLARE v_transaction_id INT;
    DECLARE v_final_tx_hash VARCHAR(66);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SELECT r.role_name, c.company_id, u.wallet_address
    INTO v_buyer_role, v_buyer_company_id, v_buyer_wallet
    FROM users u
    JOIN roles r ON r.role_id = u.role_id
    LEFT JOIN companies c ON c.user_id = u.user_id
    WHERE u.user_id = p_buyer_user_id;

    IF v_buyer_role IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Buyer does not exist';
    END IF;

    IF v_buyer_role <> 'COMPANY' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Only companies can purchase credits';
    END IF;

    IF v_buyer_company_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Buyer company profile does not exist';
    END IF;

    IF v_buyer_wallet IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Buyer wallet address is required';
    END IF;

    START TRANSACTION;

    SELECT
        ml.status,
        ml.quantity_available,
        cpa.price_per_credit,
        ml.seller_company_id,
        ml.blockchain_token_id
    INTO
        v_listing_status,
        v_available,
        v_price,
        v_seller_company_id,
        v_token_id
    FROM marketplace_listings ml
    JOIN credit_price_approvals cpa
      ON cpa.price_approval_id = ml.price_approval_id
    WHERE ml.listing_id = p_listing_id
    FOR UPDATE;

    IF v_listing_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Marketplace listing does not exist';
    END IF;

    IF v_listing_status NOT IN ('ACTIVE','PARTIALLY_SOLD') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Marketplace listing is not available';
    END IF;

    IF v_buyer_company_id = v_seller_company_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Company cannot purchase its own listing';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Purchase quantity must be greater than zero';
    END IF;

    IF p_quantity > v_available THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient credits available in listing';
    END IF;

    SELECT wallet_address
    INTO v_seller_wallet
    FROM companies c
    JOIN users u ON u.user_id = c.user_id
    WHERE c.company_id = v_seller_company_id;

    IF v_seller_wallet IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Seller wallet address is required';
    END IF;

    SELECT cc.credit_id
    INTO v_credit_id
    FROM blockchain_tokens bt
    JOIN carbon_credits cc
      ON cc.credit_id = bt.credit_id
    WHERE bt.blockchain_token_id = v_token_id;

    IF v_credit_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Blockchain token is not linked to a carbon credit';
    END IF;

    IF p_blockchain_tx_hash IS NULL OR TRIM(p_blockchain_tx_hash) = '' THEN
        SET v_final_tx_hash = CONCAT('0x', LOWER(HEX(RANDOM_BYTES(32))));
    ELSE
        SET v_final_tx_hash = TRIM(p_blockchain_tx_hash);
    END IF;

    SET v_total = p_quantity * v_price;

    INSERT INTO transactions (
        listing_id,
        buyer_company_id,
        quantity,
        price_per_credit,
        total_amount,
        blockchain_tx_hash,
        transaction_status
    )
    VALUES (
        p_listing_id,
        v_buyer_company_id,
        p_quantity,
        v_price,
        v_total,
        v_final_tx_hash,
        'SUCCESSFUL'
    );

    SET v_transaction_id = LAST_INSERT_ID();

    UPDATE company_credit_holdings
    SET quantity_owned = quantity_owned - p_quantity
    WHERE company_id = v_seller_company_id
      AND credit_id = v_credit_id
      AND quantity_owned >= p_quantity;

    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Seller does not own enough credits';
    END IF;

    INSERT INTO company_credit_holdings (
        company_id,
        credit_id,
        quantity_owned
    )
    VALUES (
        v_buyer_company_id,
        v_credit_id,
        p_quantity
    )
    ON DUPLICATE KEY UPDATE
        quantity_owned = quantity_owned + p_quantity;

    UPDATE marketplace_listings
    SET quantity_available = quantity_available - p_quantity
    WHERE listing_id = p_listing_id;

    INSERT INTO token_transfers (
        blockchain_token_id,
        from_wallet,
        to_wallet,
        quantity,
        transaction_hash,
        block_number,
        transfer_type
    )
    VALUES (
        v_token_id,
        v_seller_wallet,
        v_buyer_wallet,
        p_quantity,
        v_final_tx_hash,
        FLOOR(18000000 + (RAND() * 500000)),
        'TRANSFER'
    );

    COMMIT;

    SELECT v_transaction_id AS transaction_id;
END;
`);

    console.log("Dropping and recreating sp_retire_credits...");
    await pool.query("DROP PROCEDURE IF EXISTS sp_retire_credits");
    await pool.query(`
CREATE PROCEDURE sp_retire_credits(
    IN p_company_user_id INT,
    IN p_token_id INT,
    IN p_quantity INT,
    IN p_reason VARCHAR(255),
    IN p_beneficiary VARCHAR(255),
    IN p_blockchain_tx_hash VARCHAR(66)
)
BEGIN
    DECLARE v_role_name VARCHAR(30);
    DECLARE v_company_id INT;
    DECLARE v_wallet VARCHAR(42);
    DECLARE v_token_status VARCHAR(20);
    DECLARE v_credit_id INT;
    DECLARE v_available_balance INT DEFAULT 0;
    DECLARE v_active_listed INT DEFAULT 0;
    DECLARE v_retirement_id INT;
    DECLARE v_final_tx_hash VARCHAR(66);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SELECT r.role_name, c.company_id, u.wallet_address
    INTO v_role_name, v_company_id, v_wallet
    FROM users u
    JOIN roles r ON r.role_id = u.role_id
    LEFT JOIN companies c ON c.user_id = u.user_id
    WHERE u.user_id = p_company_user_id;

    IF v_role_name IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'User does not exist';
    END IF;

    IF v_role_name <> 'COMPANY' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Only companies can retire credits';
    END IF;

    IF v_company_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Company profile does not exist';
    END IF;

    IF v_wallet IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Company wallet address is required';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Retirement quantity must be greater than zero';
    END IF;

    START TRANSACTION;

    SELECT status, credit_id
    INTO v_token_status, v_credit_id
    FROM blockchain_tokens
    WHERE blockchain_token_id = p_token_id
    FOR UPDATE;

    IF v_token_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Blockchain token does not exist';
    END IF;

    IF v_token_status <> 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Blockchain token is not active';
    END IF;

    SELECT COALESCE(quantity_owned, 0)
    INTO v_available_balance
    FROM company_credit_holdings
    WHERE company_id = v_company_id
      AND credit_id = v_credit_id
    FOR UPDATE;

    SELECT COALESCE(SUM(quantity_available), 0)
    INTO v_active_listed
    FROM marketplace_listings
    WHERE seller_company_id = v_company_id
      AND blockchain_token_id = p_token_id
      AND status IN ('ACTIVE','PARTIALLY_SOLD');

    IF p_quantity > (v_available_balance - v_active_listed) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient unlisted credits available for retirement';
    END IF;

    UPDATE company_credit_holdings
    SET quantity_owned = quantity_owned - p_quantity
    WHERE company_id = v_company_id
      AND credit_id = v_credit_id
      AND quantity_owned >= p_quantity;

    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient credit balance';
    END IF;

    IF p_blockchain_tx_hash IS NULL OR TRIM(p_blockchain_tx_hash) = '' THEN
        SET v_final_tx_hash = CONCAT('0x', LOWER(HEX(RANDOM_BYTES(32))));
    ELSE
        SET v_final_tx_hash = TRIM(p_blockchain_tx_hash);
    END IF;

    INSERT INTO credit_retirements (
        company_id,
        blockchain_token_id,
        quantity,
        reason,
        beneficiary,
        blockchain_tx_hash
    )
    VALUES (
        v_company_id,
        p_token_id,
        p_quantity,
        p_reason,
        p_beneficiary,
        v_final_tx_hash
    );

    SET v_retirement_id = LAST_INSERT_ID();

    INSERT INTO token_transfers (
        blockchain_token_id,
        from_wallet,
        to_wallet,
        quantity,
        transaction_hash,
        block_number,
        transfer_type
    )
    VALUES (
        p_token_id,
        v_wallet,
        '0x0000000000000000000000000000000000000000',
        p_quantity,
        v_final_tx_hash,
        FLOOR(18000000 + (RAND() * 500000)),
        'TRANSFER'
    );

    COMMIT;

    SELECT v_retirement_id AS retirement_id;
END;
`);

    console.log("Dropping and recreating sp_complete_project...");
    await pool.query("DROP PROCEDURE IF EXISTS sp_complete_project");
    await pool.query(`
CREATE PROCEDURE sp_complete_project(
    IN p_project_id INT,
    IN p_verifier_user_id INT,
    IN p_credits_used INT,
    IN p_remarks TEXT
)
BEGIN
    DECLARE v_role_name VARCHAR(30);
    DECLARE v_project_status VARCHAR(30);
    DECLARE v_company_id INT;
    DECLARE v_completion_id INT;
    DECLARE v_verification_id INT;
    DECLARE v_notification_id INT DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SELECT r.role_name
    INTO v_role_name
    FROM users u
    JOIN roles r ON r.role_id = u.role_id
    WHERE u.user_id = p_verifier_user_id;

    IF v_role_name IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Verifier does not exist';
    END IF;

    IF v_role_name <> 'VERIFIER' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Only verifiers can complete project verification';
    END IF;

    SELECT
        cp.status,
        cp.owner_company_id
    INTO
        v_project_status,
        v_company_id
    FROM carbon_projects cp
    WHERE cp.project_id = p_project_id;

    IF v_project_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Project does not exist';
    END IF;

    IF v_project_status NOT IN ('IN_PROGRESS','COMPLETION_PENDING','CREDITS_ISSUED') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Project is not ready for completion verification';
    END IF;

    IF p_credits_used IS NULL OR p_credits_used < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Credits used cannot be negative';
    END IF;

    START TRANSACTION;

    INSERT INTO project_completion_reports (
        project_id,
        verifier_id,
        credits_used,
        remarks
    )
    VALUES (
        p_project_id,
        p_verifier_user_id,
        p_credits_used,
        p_remarks
    );

    SET v_completion_id = LAST_INSERT_ID();

    INSERT INTO project_verifications (
        project_id,
        verifier_id,
        verification_stage,
        verified_co2_reduction,
        credits_used,
        status,
        remarks
    )
    VALUES (
        p_project_id,
        p_verifier_user_id,
        'COMPLETION_REVIEW',
        NULL,
        p_credits_used,
        'APPROVED',
        p_remarks
    );

    SET v_verification_id = LAST_INSERT_ID();

    INSERT INTO credit_usage_reports (
        completion_id,
        credits_used
    )
    VALUES (
        v_completion_id,
        p_credits_used
    );

    UPDATE carbon_projects
    SET status = 'COMPLETED'
    WHERE project_id = p_project_id;

    SELECT notification_id
    INTO v_notification_id
    FROM verification_notifications
    WHERE project_id = p_project_id
      AND verifier_id = p_verifier_user_id
      AND notification_type = 'COMPLETION_REVIEW'
      AND notification_status = 'PENDING'
    ORDER BY notification_id
    LIMIT 1;

    IF v_notification_id IS NOT NULL THEN
        UPDATE verification_notifications
        SET
            notification_status = 'COMPLETED',
            completed_at = CURRENT_TIMESTAMP
        WHERE notification_id = v_notification_id;
    END IF;

    COMMIT;

    SELECT
        v_completion_id AS completion_id,
        v_verification_id AS verification_id;
END;
`);

    console.log("SUCCESS: Stored procedures updated in carbon_v2.");
    process.exit(0);
}

run().catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
});
