USE carbon;

DROP TRIGGER IF EXISTS trg_transaction_total_insert;
DROP TRIGGER IF EXISTS trg_transaction_total_update;
DROP TRIGGER IF EXISTS trg_listing_status_insert;
DROP TRIGGER IF EXISTS trg_listing_status_update;
DROP TRIGGER IF EXISTS trg_retirement_validation;

DROP PROCEDURE IF EXISTS sp_create_project;
DROP PROCEDURE IF EXISTS sp_verify_project;
DROP PROCEDURE IF EXISTS sp_issue_credits;
DROP PROCEDURE IF EXISTS sp_create_listing;
DROP PROCEDURE IF EXISTS sp_purchase_credits;
DROP PROCEDURE IF EXISTS sp_retire_credits;

DELIMITER $$

CREATE PROCEDURE sp_create_project(
    IN p_owner_id INT,
    IN p_project_name VARCHAR(200),
    IN p_project_type VARCHAR(100),
    IN p_description TEXT,
    IN p_location VARCHAR(200),
    IN p_estimated_co2 DECIMAL(12,2),
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    DECLARE v_role VARCHAR(20);

    SELECT role
    INTO v_role
    FROM users
    WHERE user_id = p_owner_id;

    IF v_role IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'User does not exist';
    END IF;

    IF v_role <> 'SELLER' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Only sellers can create carbon projects';
    END IF;

    IF p_project_name IS NULL OR TRIM(p_project_name) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Project name is required';
    END IF;

    IF p_project_type IS NULL OR TRIM(p_project_type) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Project type is required';
    END IF;

    IF p_estimated_co2 IS NULL OR p_estimated_co2 < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Estimated CO2 reduction must be zero or greater';
    END IF;

    IF p_start_date IS NOT NULL
       AND p_end_date IS NOT NULL
       AND p_end_date < p_start_date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'End date cannot be before start date';
    END IF;

    INSERT INTO carbon_projects (
        owner_id,
        project_name,
        project_type,
        description,
        location,
        estimated_co2_reduction,
        start_date,
        end_date,
        status
    )
    VALUES (
        p_owner_id,
        p_project_name,
        p_project_type,
        p_description,
        p_location,
        p_estimated_co2,
        p_start_date,
        p_end_date,
        'SUBMITTED'
    );

    SELECT LAST_INSERT_ID() AS project_id;
END$$

CREATE PROCEDURE sp_verify_project(
    IN p_project_id INT,
    IN p_verifier_id INT,
    IN p_verified_co2 DECIMAL(12,2),
    IN p_status VARCHAR(20),
    IN p_remarks TEXT
)
BEGIN
    DECLARE v_role VARCHAR(20);
    DECLARE v_project_status VARCHAR(30);
    DECLARE v_project_exists INT DEFAULT 0;

    SELECT COUNT(*)
    INTO v_project_exists
    FROM carbon_projects
    WHERE project_id = p_project_id;

    IF v_project_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Project does not exist';
    END IF;

    SELECT role
    INTO v_role
    FROM users
    WHERE user_id = p_verifier_id;

    IF v_role IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Verifier does not exist';
    END IF;

    IF v_role <> 'ADMIN' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Only administrators can verify projects';
    END IF;

    SELECT status
    INTO v_project_status
    FROM carbon_projects
    WHERE project_id = p_project_id;

    IF v_project_status NOT IN ('SUBMITTED', 'UNDER_REVIEW') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Project is not available for verification';
    END IF;

    IF UPPER(p_status) NOT IN ('APPROVED', 'REJECTED') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid verification status';
    END IF;

    IF UPPER(p_status) = 'APPROVED'
       AND (p_verified_co2 IS NULL OR p_verified_co2 <= 0) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Approved projects must have positive verified CO2 reduction';
    END IF;

    IF UPPER(p_status) = 'REJECTED'
       AND p_verified_co2 IS NULL THEN
        SET p_verified_co2 = 0;
    END IF;

    INSERT INTO project_verifications (
        project_id,
        verifier_id,
        verified_co2_reduction,
        status,
        remarks
    )
    VALUES (
        p_project_id,
        p_verifier_id,
        p_verified_co2,
        UPPER(p_status),
        p_remarks
    );

    UPDATE carbon_projects
    SET status = UPPER(p_status)
    WHERE project_id = p_project_id;

    SELECT LAST_INSERT_ID() AS verification_id;
END$$

CREATE PROCEDURE sp_issue_credits(
    IN p_project_id INT,
    IN p_verification_id INT,
    IN p_quantity INT,
    IN p_year YEAR
)
BEGIN
    DECLARE v_verification_project INT;
    DECLARE v_verification_status VARCHAR(20);
    DECLARE v_verified_co2 DECIMAL(12,2);
    DECLARE v_project_status VARCHAR(30);
    DECLARE v_existing_credits INT DEFAULT 0;

    SELECT
        project_id,
        status,
        verified_co2_reduction
    INTO
        v_verification_project,
        v_verification_status,
        v_verified_co2
    FROM project_verifications
    WHERE verification_id = p_verification_id;

    IF v_verification_project IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Verification does not exist';
    END IF;

    IF v_verification_project <> p_project_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Verification does not belong to the project';
    END IF;

    IF v_verification_status <> 'APPROVED' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Credits can only be issued for approved verification';
    END IF;

    SELECT status
    INTO v_project_status
    FROM carbon_projects
    WHERE project_id = p_project_id;

    IF v_project_status NOT IN ('APPROVED', 'CREDITS_ISSUED') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Project is not approved for credit issuance';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Credit quantity must be greater than zero';
    END IF;

    IF p_quantity > v_verified_co2 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Credit quantity cannot exceed verified CO2 reduction';
    END IF;

    IF p_year IS NULL OR p_year < 2000 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid vintage year';
    END IF;

    SELECT COUNT(*)
    INTO v_existing_credits
    FROM carbon_credits
    WHERE verification_id = p_verification_id;

    IF v_existing_credits > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Credits have already been issued for this verification';
    END IF;

    INSERT INTO carbon_credits (
        project_id,
        verification_id,
        quantity,
        vintage_year,
        issue_date,
        status
    )
    VALUES (
        p_project_id,
        p_verification_id,
        p_quantity,
        p_year,
        CURDATE(),
        'ISSUED'
    );

    UPDATE carbon_projects
    SET status = 'CREDITS_ISSUED'
    WHERE project_id = p_project_id;

    SELECT LAST_INSERT_ID() AS credit_id;
END$$

CREATE PROCEDURE sp_create_listing(
    IN p_seller_id INT,
    IN p_token_id INT,
    IN p_quantity INT,
    IN p_price DECIMAL(10,2),
    IN p_expiry DATE
)
BEGIN
    DECLARE v_role VARCHAR(20);
    DECLARE v_seller_wallet VARCHAR(42);
    DECLARE v_token_status VARCHAR(20);
    DECLARE v_available_balance INT DEFAULT 0;
    DECLARE v_active_listed INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT
        role,
        wallet_address
    INTO
        v_role,
        v_seller_wallet
    FROM users
    WHERE user_id = p_seller_id
    FOR UPDATE;

    IF v_role IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Seller does not exist';
    END IF;

    IF v_role <> 'SELLER' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Only sellers can create marketplace listings';
    END IF;

    IF v_seller_wallet IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Seller wallet address is required';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Listing quantity must be greater than zero';
    END IF;

    IF p_price IS NULL OR p_price <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Listing price must be greater than zero';
    END IF;

    SELECT status
    INTO v_token_status
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

    SELECT
        COALESCE(
            SUM(
                CASE
                    WHEN tt.to_wallet = v_seller_wallet
                    THEN tt.quantity
                    ELSE 0
                END
            ),
            0
        )
        -
        COALESCE(
            SUM(
                CASE
                    WHEN tt.from_wallet = v_seller_wallet
                    THEN tt.quantity
                    ELSE 0
                END
            ),
            0
        )
    INTO v_available_balance
    FROM token_transfers tt
    WHERE tt.blockchain_token_id = p_token_id;

    SELECT
        COALESCE(SUM(quantity_available), 0)
    INTO v_active_listed
    FROM marketplace_listings
    WHERE seller_id = p_seller_id
      AND blockchain_token_id = p_token_id
      AND status IN ('ACTIVE', 'PARTIALLY_SOLD');

    IF p_quantity > (v_available_balance - v_active_listed) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Seller does not have enough available credits';
    END IF;

    INSERT INTO marketplace_listings (
        seller_id,
        blockchain_token_id,
        quantity_listed,
        quantity_available,
        price_per_credit,
        status,
        expires_at
    )
    VALUES (
        p_seller_id,
        p_token_id,
        p_quantity,
        p_quantity,
        p_price,
        'ACTIVE',
        p_expiry
    );

    COMMIT;

    SELECT LAST_INSERT_ID() AS listing_id;
END$$

CREATE PROCEDURE sp_purchase_credits(
    IN p_listing_id INT,
    IN p_buyer_id INT,
    IN p_quantity INT,
    IN p_blockchain_tx_hash VARCHAR(66)
)
BEGIN
    DECLARE v_listing_status VARCHAR(30);
    DECLARE v_available INT;
    DECLARE v_price DECIMAL(10,2);
    DECLARE v_seller_id INT;
    DECLARE v_token_id INT;
    DECLARE v_seller_wallet VARCHAR(42);
    DECLARE v_buyer_wallet VARCHAR(42);
    DECLARE v_buyer_role VARCHAR(20);
    DECLARE v_total DECIMAL(12,2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT
        ml.status,
        ml.quantity_available,
        ml.price_per_credit,
        ml.seller_id,
        ml.blockchain_token_id
    INTO
        v_listing_status,
        v_available,
        v_price,
        v_seller_id,
        v_token_id
    FROM marketplace_listings ml
    WHERE ml.listing_id = p_listing_id
    FOR UPDATE;

    IF v_listing_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Marketplace listing does not exist';
    END IF;

    IF v_listing_status NOT IN ('ACTIVE', 'PARTIALLY_SOLD') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Marketplace listing is not available';
    END IF;

    SELECT
        role,
        wallet_address
    INTO
        v_buyer_role,
        v_buyer_wallet
    FROM users
    WHERE user_id = p_buyer_id
    FOR UPDATE;

    IF v_buyer_role IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Buyer does not exist';
    END IF;

    IF v_buyer_role <> 'BUYER' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Only buyers can purchase credits';
    END IF;

    IF p_buyer_id = v_seller_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Seller cannot purchase their own listing';
    END IF;

    IF v_buyer_wallet IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Buyer wallet address is required';
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
    FROM users
    WHERE user_id = v_seller_id
    FOR UPDATE;

    IF v_seller_wallet IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Seller wallet address is required';
    END IF;

    IF v_seller_wallet = v_buyer_wallet THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Buyer and seller wallets cannot be the same';
    END IF;

    SELECT blockchain_token_id
    INTO v_token_id
    FROM marketplace_listings
    WHERE listing_id = p_listing_id
    FOR UPDATE;

    SELECT status
    INTO v_listing_status
    FROM blockchain_tokens
    WHERE blockchain_token_id = v_token_id
    FOR UPDATE;

    IF v_listing_status <> 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Blockchain token is not active';
    END IF;

    SET v_total = p_quantity * v_price;

    INSERT INTO transactions (
        listing_id,
        buyer_id,
        seller_id,
        blockchain_token_id,
        quantity,
        price_per_credit,
        total_amount,
        blockchain_tx_hash,
        transaction_status
    )
    VALUES (
        p_listing_id,
        p_buyer_id,
        v_seller_id,
        v_token_id,
        p_quantity,
        v_price,
        v_total,
        p_blockchain_tx_hash,
        'SUCCESSFUL'
    );

    UPDATE marketplace_listings
    SET quantity_available = quantity_available - p_quantity
    WHERE listing_id = p_listing_id;

    IF p_blockchain_tx_hash IS NOT NULL THEN

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
            p_blockchain_tx_hash,
            NULL,
            'TRANSFER'
        );

    END IF;

    COMMIT;

    SELECT LAST_INSERT_ID() AS transaction_id;
END$$

CREATE PROCEDURE sp_retire_credits(
    IN p_user_id INT,
    IN p_token_id INT,
    IN p_quantity INT,
    IN p_reason VARCHAR(255),
    IN p_beneficiary VARCHAR(255),
    IN p_blockchain_tx_hash VARCHAR(66)
)
BEGIN
    DECLARE v_role VARCHAR(20);
    DECLARE v_wallet VARCHAR(42);
    DECLARE v_token_status VARCHAR(20);
    DECLARE v_available_balance INT DEFAULT 0;
    DECLARE v_active_listed INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT
        role,
        wallet_address
    INTO
        v_role,
        v_wallet
    FROM users
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_role IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'User does not exist';
    END IF;

    IF v_role NOT IN ('BUYER', 'SELLER') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid user role for retirement';
    END IF;

    IF v_wallet IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'User wallet address is required';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Retirement quantity must be greater than zero';
    END IF;

    SELECT status
    INTO v_token_status
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

    SELECT
        COALESCE(
            SUM(
                CASE
                    WHEN tt.to_wallet = v_wallet
                    THEN tt.quantity
                    ELSE 0
                END
            ),
            0
        )
        -
        COALESCE(
            SUM(
                CASE
                    WHEN tt.from_wallet = v_wallet
                    THEN tt.quantity
                    ELSE 0
                END
            ),
            0
		)
        -
		COALESCE(
			(
				SELECT SUM(cr.quantity)
				FROM credit_retirements cr
				WHERE cr.user_id = p_user_id
				AND cr.blockchain_token_id = p_token_id
			),
			0
		)
    INTO v_available_balance
    FROM token_transfers tt
    WHERE tt.blockchain_token_id = p_token_id;

    SELECT
        COALESCE(SUM(quantity_available), 0)
    INTO v_active_listed
    FROM marketplace_listings
    WHERE seller_id = p_user_id
      AND blockchain_token_id = p_token_id
      AND status IN ('ACTIVE', 'PARTIALLY_SOLD');

    IF p_quantity > (v_available_balance - v_active_listed) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient unlisted credits available for retirement';
    END IF;

    INSERT INTO credit_retirements (
        user_id,
        blockchain_token_id,
        quantity,
        reason,
        beneficiary,
        blockchain_tx_hash
    )
    VALUES (
        p_user_id,
        p_token_id,
        p_quantity,
        p_reason,
        p_beneficiary,
        p_blockchain_tx_hash
    );

    COMMIT;

    SELECT LAST_INSERT_ID() AS retirement_id;
END$$

CREATE TRIGGER trg_transaction_total_insert
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    SET NEW.total_amount =
        NEW.quantity * NEW.price_per_credit;
END$$

CREATE TRIGGER trg_transaction_total_update
BEFORE UPDATE ON transactions
FOR EACH ROW
BEGIN
    SET NEW.total_amount =
        NEW.quantity * NEW.price_per_credit;
END$$

CREATE TRIGGER trg_listing_status_insert
BEFORE INSERT ON marketplace_listings
FOR EACH ROW
BEGIN
    IF NEW.quantity_available <= 0 THEN
        SET NEW.quantity_available = 0;
        SET NEW.status = 'SOLD';
    ELSEIF NEW.quantity_available < NEW.quantity_listed THEN
        SET NEW.status = 'PARTIALLY_SOLD';
    ELSE
        SET NEW.status = 'ACTIVE';
    END IF;
END$$

CREATE TRIGGER trg_listing_status_update
BEFORE UPDATE ON marketplace_listings
FOR EACH ROW
BEGIN
    IF NEW.quantity_available <= 0 THEN
        SET NEW.quantity_available = 0;
        SET NEW.status = 'SOLD';
    ELSEIF NEW.quantity_available < NEW.quantity_listed THEN
        SET NEW.status = 'PARTIALLY_SOLD';
    ELSE
        SET NEW.status = 'ACTIVE';
    END IF;
END$$

CREATE TRIGGER trg_retirement_validation
BEFORE INSERT ON credit_retirements
FOR EACH ROW
BEGIN
    IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Retirement quantity must be greater than zero';
    END IF;
END$$

DELIMITER ;

SHOW PROCEDURE STATUS
WHERE Db = 'carbon';

SHOW TRIGGERS FROM carbon;