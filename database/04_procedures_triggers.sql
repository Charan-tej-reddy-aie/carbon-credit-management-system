USE carbon;

DROP TRIGGER IF EXISTS trg_transaction_total_insert;
DROP TRIGGER IF EXISTS trg_transaction_total_update;
DROP TRIGGER IF EXISTS trg_listing_status_insert;
DROP TRIGGER IF EXISTS trg_listing_status_update;
DROP TRIGGER IF EXISTS trg_retirement_validation;
DROP PROCEDURE IF EXISTS sp_create_project;
DROP PROCEDURE IF EXISTS sp_verify_project;
DROP PROCEDURE IF EXISTS sp_complete_project;
DROP PROCEDURE IF EXISTS sp_issue_credits;
DROP PROCEDURE IF EXISTS sp_create_listing;
DROP PROCEDURE IF EXISTS sp_purchase_credits;
DROP PROCEDURE IF EXISTS sp_retire_credits;
DROP PROCEDURE IF EXISTS sp_approve_credit_price;
DROP PROCEDURE IF EXISTS sp_request_price_change;
DROP PROCEDURE IF EXISTS sp_review_price_change;
DROP PROCEDURE IF EXISTS sp_get_company_credit_summary;

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
    DECLARE v_credit_difference DECIMAL(14,2) DEFAULT 0;
    DECLARE v_project_id INT;

    SELECT role
    INTO v_role
    FROM users
    WHERE user_id = p_owner_id;

    IF v_role IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'User does not exist';
    END IF;

    IF v_role <> 'COMPANY' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Only companies can create carbon projects';
    END IF;

    SELECT COALESCE(credit_difference, 0)
    INTO v_credit_difference
    FROM company_credit_summary
    WHERE company_id = p_owner_id;

    IF v_credit_difference < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Company has a credit deficit. Purchase carbon credits before creating a new project';
    END IF;
    
    IF p_project_name IS NULL
       OR TRIM(p_project_name) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Project name is required';
    END IF;
    
    IF p_project_type IS NULL
       OR TRIM(p_project_type) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Project type is required';
    END IF;

    IF p_estimated_co2 IS NULL
       OR p_estimated_co2 < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Estimated CO2 reduction must be zero or greater';

    END IF;

    IF p_start_date IS NOT NULL
       AND p_end_date IS NOT NULL
       AND p_end_date < p_start_date THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='End date cannot be before start date';

    END IF;

    INSERT INTO carbon_projects (owner_id,project_name,project_type,
        description,
        location,estimated_co2_reduction,start_date,end_date,
        status
    )
    VALUES (p_owner_id,p_project_name,p_project_type,p_description,
        p_location,p_estimated_co2,p_start_date,p_end_date,
        'SUBMITTED'
    );

    SET v_project_id = LAST_INSERT_ID();

    INSERT INTO verification_notifications (project_id,verifier_id,notification_type,notification_status
    )
    SELECT
	v_project_id,u.user_id,
        'START_APPROVAL',
        'PENDING'
    FROM users u
    WHERE u.role = 'VERIFIER'
      AND u.account_status = 'ACTIVE'
    ORDER BY u.user_id
    LIMIT 1;

    SELECT v_project_id AS project_id;

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
    DECLARE v_notification_id INT DEFAULT NULL;
    DECLARE v_verification_id INT;

    SELECT COUNT(*)
    INTO v_project_exists
    FROM carbon_projects
    WHERE project_id = p_project_id;

    IF v_project_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Project does not exist';
    END IF;

    SELECT role
    INTO v_role
    FROM users
    WHERE user_id = p_verifier_id;

    IF v_role IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Verifier does not exist';
    END IF;

    IF v_role <> 'VERIFIER' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Only verifiers can verify projects';
    END IF;
    
    SELECT status
    INTO v_project_status
    FROM carbon_projects
    WHERE project_id = p_project_id;
    
    IF v_project_status NOT IN (
        'SUBMITTED',
        'UNDER_REVIEW'
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Project is not available for start approval';
    END IF;

    IF UPPER(p_status) NOT IN (
        'APPROVED',
        'REJECTED'
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Invalid verification status';
    END IF;
    
    IF UPPER(p_status) = 'APPROVED'
       AND (
            p_verified_co2 IS NULL
            OR p_verified_co2 <= 0
       ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Approved projects must have positive verified CO2 reduction';
    END IF;

    IF UPPER(p_status) = 'REJECTED'
       AND p_verified_co2 IS NULL THEN
        SET p_verified_co2 = 0;

    END IF;


    INSERT INTO project_verifications (project_id,verifier_id,verification_stage,verified_co2_reduction,credits_used,
        status,
        remarks
    )
    VALUES (p_project_id,p_verifier_id,
        'START_APPROVAL',
        p_verified_co2,
        NULL,
        UPPER(p_status),
        p_remarks
    );
    SET v_verification_id = LAST_INSERT_ID();
    IF UPPER(p_status) = 'APPROVED' THEN

        UPDATE carbon_projects
        SET status = 'APPROVED'
        WHERE project_id = p_project_id;

    ELSE

        UPDATE carbon_projects
        SET status = 'REJECTED'
        WHERE project_id = p_project_id;

    END IF;

    SELECT notification_id
    INTO v_notification_id
    FROM verification_notifications
    WHERE project_id = p_project_id
      AND verifier_id = p_verifier_id
      AND notification_type = 'START_APPROVAL'
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

    IF UPPER(p_status) = 'APPROVED' THEN

        UPDATE carbon_projects
        SET status = 'IN_PROGRESS'
        WHERE project_id = p_project_id;

        INSERT INTO verification_notifications (project_id,verifier_id,notification_type,notification_status
        )
        VALUES (
            p_project_id,p_verifier_id,
            'COMPLETION_REVIEW',
            'PENDING'
        );
    END IF;

    SELECT v_verification_id AS verification_id;

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
    DECLARE v_verification_stage VARCHAR(30);
    DECLARE v_verified_co2 DECIMAL(12,2);
    DECLARE v_project_status VARCHAR(30);
    DECLARE v_owner_id INT;
    DECLARE v_existing_credits INT DEFAULT 0;
    DECLARE v_credit_id INT;


    SELECT
        project_id,
        status,
        verification_stage,
        verified_co2_reduction
    INTO
        v_verification_project,
        v_verification_status,
        v_verification_stage,
        v_verified_co2
    FROM project_verifications
    WHERE verification_id = p_verification_id;
    IF v_verification_project IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Verification does not exist';
    END IF;

    IF v_verification_project <> p_project_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Verification does not belong to the project';
    END IF;

    IF v_verification_stage <> 'START_APPROVAL' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Credits must be issued using the start approval verification';

    END IF;

    IF v_verification_status <> 'APPROVED' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Credits can only be issued for approved verification';
    END IF;

    SELECT
        status,
        owner_id
    INTO
        v_project_status,
        v_owner_id
    FROM carbon_projects
    WHERE project_id = p_project_id;


    IF v_project_status NOT IN (
        'APPROVED',
        'IN_PROGRESS',
        'COMPLETED',
        'CREDITS_ISSUED'
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Project is not approved for credit issuance';

    END IF;

    IF p_quantity IS NULL
       OR p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Credit quantity must be greater than zero';

    END IF;

    IF p_year IS NULL
       OR p_year < 2000 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Invalid vintage year';

    END IF;

    SELECT COUNT(*)
    INTO v_existing_credits
    FROM carbon_credits
    WHERE verification_id = p_verification_id;

    IF v_existing_credits > 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Credits have already been issued for this verification';
    END IF;

    INSERT INTO carbon_credits (project_id,verification_id,quantity,vintage_year,issue_date,
        status
    )
    VALUES (p_project_id,p_verification_id,p_quantity,p_year,
        CURDATE(),
        'ISSUED'
    );
    SET v_credit_id = LAST_INSERT_ID();

    INSERT INTO company_credit_holdings (
        company_id,
        credit_id,
        quantity_owned
    )
    VALUES (
        v_owner_id,
        v_credit_id,
        p_quantity
    );
    UPDATE carbon_projects
    SET status = 'CREDITS_ISSUED'
    WHERE project_id = p_project_id;
    SELECT v_credit_id AS credit_id;
END$$

CREATE PROCEDURE sp_get_company_credit_summary(
    IN p_company_id INT
)
BEGIN
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
    FROM company_credit_summary
    WHERE company_id = p_company_id;
END$$

CREATE PROCEDURE sp_create_listing(
    IN p_company_id INT,
    IN p_token_id INT,
    IN p_quantity INT,
    IN p_price_approval_id INT,
    IN p_expiry DATE
)
BEGIN
    DECLARE v_role VARCHAR(20);
    DECLARE v_credit_difference INT DEFAULT 0;
    DECLARE v_available_surplus INT DEFAULT 0;
    DECLARE v_approved_price DECIMAL(10,2);
    DECLARE v_approval_project INT;
    DECLARE v_approval_status VARCHAR(20);
    DECLARE v_token_status VARCHAR(20);
    DECLARE v_existing_listed INT DEFAULT 0;
    DECLARE v_seller_wallet VARCHAR(42);
    DECLARE v_project_id INT;
    DECLARE v_project_owner INT;
    DECLARE v_listing_id INT;
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
    WHERE user_id = p_company_id
    FOR UPDATE;
    IF v_role IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Company does not exist';
    END IF;
    
    IF v_role <> 'COMPANY' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Only companies can create marketplace listings';
    END IF;
    
    IF v_seller_wallet IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Company wallet address is required';
    END IF;

    SELECT
        credit_difference
    INTO
        v_credit_difference
    FROM company_credit_summary
    WHERE company_id = p_company_id;

    SET v_available_surplus =
        GREATEST(v_credit_difference, 0);
    IF p_quantity IS NULL
       OR p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Listing quantity must be greater than zero';

    END IF;

    IF p_quantity > v_available_surplus THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Company cannot sell more credits than its available surplus';

    END IF;

    SELECT
        project_id,verifier_id,price_per_credit,
        status
    INTO
        v_approval_project,@v_verifier_id,v_approved_price,v_approval_status
    FROM credit_price_approvals
    WHERE price_approval_id = p_price_approval_id
    FOR UPDATE;
    IF v_approved_price IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Price approval does not exist';
    END IF;

    IF v_approval_status <> 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Price approval is not active';
    END IF;
    IF p_token_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Blockchain token is required';
    END IF;

    SELECT
        status
    INTO
        v_token_status
    FROM blockchain_tokens
    WHERE blockchain_token_id = p_token_id
    FOR UPDATE;
    IF v_token_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Blockchain token does not exist';
    END IF;

    IF v_token_status <> 'ACTIVE' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Blockchain token is not active';
    END IF;

    SELECT
        project_id
    INTO
        v_project_id
    FROM blockchain_tokens
    WHERE blockchain_token_id = p_token_id;

    SELECT
        owner_id
    INTO
        v_project_owner
    FROM carbon_projects
    WHERE project_id = v_project_id;

    IF v_project_owner <> p_company_id THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Company does not own the selected project credits';
    END IF;

    SELECT
        COALESCE(
            SUM(quantity_available),
            0
        )
    INTO
        v_existing_listed
    FROM marketplace_listings
    WHERE seller_id = p_company_id
      AND blockchain_token_id = p_token_id
      AND status IN (
          'ACTIVE',
          'PARTIALLY_SOLD'
      );
    IF p_quantity >
       (
           v_available_surplus
           - v_existing_listed
       ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Some surplus credits are already listed';
    END IF;
    
    INSERT INTO marketplace_listings (
        seller_id,
        blockchain_token_id,
        quantity_listed,
        quantity_available,
        price_per_credit,
        price_approval_id,
        status,
        expires_at
    )
    VALUES (p_company_id,p_token_id,p_quantity,p_quantity,
        v_approved_price,p_price_approval_id,
        'ACTIVE',
        p_expiry
    );
    SET v_listing_id = LAST_INSERT_ID();
    COMMIT;
    SELECT v_listing_id AS listing_id;
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
    DECLARE v_seller_role VARCHAR(20);
    DECLARE v_total DECIMAL(12,2);
    DECLARE v_credit_id INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    SELECT
        status,
        quantity_available,
        price_per_credit,
        seller_id,
        blockchain_token_id
    INTO
        v_listing_status,
        v_available,
        v_price,
        v_seller_id,
        v_token_id
    FROM marketplace_listings
    WHERE listing_id = p_listing_id
    FOR UPDATE;
    IF v_listing_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Marketplace listing does not exist';
    END IF;
    
    IF v_listing_status NOT IN (
        'ACTIVE',
        'PARTIALLY_SOLD'
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Marketplace listing is not available';
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
        SET MESSAGE_TEXT ='Buyer does not exist';

    END IF;

    IF v_buyer_role <> 'COMPANY' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Only companies can purchase credits';
    END IF;

    SELECT
        role,
        wallet_address
    INTO
        v_seller_role,
        v_seller_wallet
    FROM users
    WHERE user_id = v_seller_id
    FOR UPDATE;


    IF v_seller_role <> 'COMPANY' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Listing seller is not a company';
    END IF;

    IF p_buyer_id = v_seller_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Company cannot purchase its own listing';
    END IF;

    IF v_buyer_wallet IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Buyer wallet address is required';
    END IF;

    IF v_seller_wallet IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Seller wallet address is required';
    END IF;
    
    IF p_quantity IS NULL
       OR p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Purchase quantity must be greater than zero';
    END IF;
    
    IF p_quantity > v_available THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Insufficient credits available in listing';
    END IF;
    
    SET v_total =
        p_quantity * v_price;
    SELECT
        credit_id
    INTO
        v_credit_id
    FROM blockchain_tokens
    WHERE blockchain_token_id = v_token_id;
    INSERT INTO transactions (listing_id,buyer_id,seller_id,blockchain_token_id,quantity,
        price_per_credit,total_amount,blockchain_tx_hash,transaction_status
    )
    VALUES (p_listing_id,p_buyer_id,v_seller_id,v_token_id,p_quantity,v_price,v_total,p_blockchain_tx_hash,
        'SUCCESSFUL'
    );
    UPDATE company_credit_holdings
    SET quantity_owned =
        quantity_owned - p_quantity
    WHERE company_id = v_seller_id
      AND credit_id = v_credit_id
      AND quantity_owned >= p_quantity;
    IF ROW_COUNT() = 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Seller does not own enough credits';
    END IF;
    
    INSERT INTO company_credit_holdings (company_id,credit_id,quantity_owned
    )
    VALUES (p_buyer_id,v_credit_id,p_quantity
    )
    ON DUPLICATE KEY UPDATE
        quantity_owned =
            quantity_owned + p_quantity;

    UPDATE marketplace_listings
    SET quantity_available =
        quantity_available - p_quantity
    WHERE listing_id = p_listing_id;

    IF p_blockchain_tx_hash IS NOT NULL THEN
        INSERT INTO token_transfers (blockchain_token_id,from_wallet,to_wallet,quantity,
            transaction_hash,block_number,transfer_type
        )
        VALUES (v_token_id,v_seller_wallet,v_buyer_wallet,p_quantity,p_blockchain_tx_hash,
            NULL,
            'TRANSFER'
        );
    END IF;
    COMMIT;
    SELECT LAST_INSERT_ID() AS transaction_id;

END$$

CREATE PROCEDURE sp_approve_credit_price(
    IN p_project_id INT,
    IN p_verifier_id INT,
    IN p_price DECIMAL(10,2)
)
BEGIN

    DECLARE v_role VARCHAR(20);
    DECLARE v_project_status VARCHAR(30);
    DECLARE v_owner_id INT;
    DECLARE v_price_id INT;

    SELECT role
    INTO v_role
    FROM users
    WHERE user_id = p_verifier_id;
    IF v_role IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Verifier does not exist';
    END IF;
    IF v_role <> 'VERIFIER' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Only verifiers can approve credit prices';
    END IF;
    
    SELECT
        status,
        owner_id
    INTO
        v_project_status,
        v_owner_id
    FROM carbon_projects
    WHERE project_id = p_project_id;
    IF v_project_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Project does not exist';
    END IF;
    
    IF p_price IS NULL
       OR p_price <= 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Price must be greater than zero';
    END IF;

    UPDATE credit_price_approvals
    SET status = 'REPLACED'
    WHERE project_id = p_project_id
      AND status = 'ACTIVE';
      
    INSERT INTO credit_price_approvals (
        project_id,
        verifier_id,
        price_per_credit,
        status
    )
    VALUES (
        p_project_id,
        p_verifier_id,
        p_price,
        'ACTIVE'
    );
    SET v_price_id =
        LAST_INSERT_ID();
    SELECT v_price_id AS price_approval_id;

END$$

CREATE PROCEDURE sp_request_price_change(
    IN p_company_id INT,
    IN p_project_id INT,
    IN p_requested_price DECIMAL(10,2),
    IN p_description TEXT
)
BEGIN

    DECLARE v_role VARCHAR(20);
    DECLARE v_current_price DECIMAL(10,2);
    DECLARE v_owner_id INT;

    SELECT role
    INTO v_role
    FROM users
    WHERE user_id = p_company_id;

    IF v_role IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Company does not exist';

    END IF;
    IF v_role <> 'COMPANY' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Only companies can request price changes';

    END IF;

    SELECT owner_id
    INTO v_owner_id
    FROM carbon_projects
    WHERE project_id = p_project_id;

    IF v_owner_id IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Project does not exist';
    END IF;

    IF v_owner_id <> p_company_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Company does not own this project';
    END IF;

    SELECT price_per_credit
    INTO v_current_price
    FROM credit_price_approvals
    WHERE project_id = p_project_id
      AND status = 'ACTIVE'
    ORDER BY price_approval_id DESC
    LIMIT 1;
    IF v_current_price IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='No active verifier-approved price exists';

    END IF;


    IF p_requested_price <= v_current_price THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Requested price must be greater than the current price';

    END IF;
    IF p_description IS NULL
       OR TRIM(p_description) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Price increase description is required';
    END IF;
    
    INSERT INTO price_change_requests (company_id,project_id,current_price,requested_price,
        description,
        status
    )
    VALUES (p_company_id,p_project_id,v_current_price,p_requested_price,p_description,
        'PENDING'
    );
    SELECT LAST_INSERT_ID() AS request_id;
END$$

CREATE PROCEDURE sp_review_price_change(
    IN p_request_id INT,
    IN p_verifier_id INT,
    IN p_status VARCHAR(20)
)
BEGIN

    DECLARE v_role VARCHAR(20);
    DECLARE v_project_id INT;
    DECLARE v_requested_price DECIMAL(10,2);
    DECLARE v_current_price DECIMAL(10,2);
    DECLARE v_request_status VARCHAR(20);
    DECLARE v_price_id INT;

    SELECT role
    INTO v_role
    FROM users
    WHERE user_id = p_verifier_id;

    IF v_role IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Verifier does not exist';
    END IF;

    IF v_role <> 'VERIFIER' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Only verifiers can review price requests';
    END IF;
    SELECT
        project_id,requested_price,current_price,
        status
    INTO
        v_project_id,v_requested_price,v_current_price,v_request_status
    FROM price_change_requests
    WHERE request_id = p_request_id
    FOR UPDATE;
    IF v_request_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Price change request does not exist';
    END IF;
    IF v_request_status <> 'PENDING' THEN
		SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Price change request has already been reviewed';
    END IF;
    IF UPPER(p_status) NOT IN ('APPROVED','REJECTED'
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Invalid price request status';

    END IF;

    UPDATE price_change_requests
    SET
        verifier_id = p_verifier_id,
        status = UPPER(p_status),
        reviewed_at = CURRENT_TIMESTAMP
    WHERE request_id = p_request_id;

    IF UPPER(p_status) = 'APPROVED' THEN
        UPDATE credit_price_approvals
        SET status = 'REPLACED'
        WHERE project_id = v_project_id
          AND status = 'ACTIVE';
        INSERT INTO credit_price_approvals (project_id,verifier_id,price_per_credit,
            status
        )
        VALUES (v_project_id,p_verifier_id,v_requested_price,
            'ACTIVE'
        );
        SET v_price_id =
            LAST_INSERT_ID();

    END IF;
    SELECT
        p_request_id AS request_id,
        UPPER(p_status) AS status,
        v_price_id AS price_approval_id;
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
    DECLARE v_credit_id INT;
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
        SET MESSAGE_TEXT ='User does not exist';
    END IF;

    IF v_role <> 'COMPANY' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Only companies can retire credits';

    END IF;

    IF v_wallet IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Company wallet address is required';
    END IF;
    
    IF p_quantity IS NULL
       OR p_quantity <= 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Retirement quantity must be greater than zero';
    END IF;
    
    SELECT
        status,
        credit_id
    INTO
        v_token_status,
        v_credit_id
    FROM blockchain_tokens
    WHERE blockchain_token_id = p_token_id
    FOR UPDATE;

    IF v_token_status IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Blockchain token does not exist';

    END IF;
    IF v_token_status <> 'ACTIVE' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Blockchain token is not active';

    END IF;
    SELECT
        quantity_owned
    INTO
        v_available_balance
    FROM company_credit_holdings
    WHERE company_id = p_user_id
      AND credit_id = v_credit_id
    FOR UPDATE;


    IF v_available_balance IS NULL THEN
        SET v_available_balance = 0;
    END IF;


    SELECT
        COALESCE(
            SUM(quantity_available),
            0
        )
    INTO
        v_active_listed
    FROM marketplace_listings
    WHERE seller_id = p_user_id
      AND blockchain_token_id = p_token_id
      AND status IN ('ACTIVE','PARTIALLY_SOLD');
    IF p_quantity >
       (v_available_balance- v_active_listed
       ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT ='Insufficient unlisted credits available for retirement';
    END IF;
    
    UPDATE company_credit_holdings
    SET quantity_owned =
        quantity_owned - p_quantity
    WHERE company_id = p_user_id
      AND credit_id = v_credit_id;
      
    INSERT INTO credit_retirements (user_id,blockchain_token_id,quantity,
        reason,beneficiary,blockchain_tx_hash
    )
    VALUES (p_user_id,p_token_id,p_quantity,
        p_reason,p_beneficiary,p_blockchain_tx_hash);
    COMMIT;
    SELECT LAST_INSERT_ID() AS retirement_id;
END$$

CREATE TRIGGER trg_transaction_total_insert
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    SET NEW.total_amount =
        NEW.quantity *
        NEW.price_per_credit;
END$$

CREATE TRIGGER trg_transaction_total_update
BEFORE UPDATE ON transactions
FOR EACH ROW

BEGIN
    SET NEW.total_amount =
        NEW.quantity *
        NEW.price_per_credit;
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
    IF NEW.quantity IS NULL
       OR NEW.quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Retirement quantity must be greater than zero';
    END IF;
END$$



DELIMITER $$

CREATE PROCEDURE sp_complete_project(
    IN p_project_id INT,
    IN p_verifier_id INT,
    IN p_verified_co2_reduction DECIMAL(12,2),
    IN p_credits_used INT,
    IN p_remarks TEXT
)
BEGIN
    DECLARE v_project_status VARCHAR(30);
    DECLARE v_owner_id INT;
    DECLARE v_remaining_credits DECIMAL(12,2);

    IF p_verified_co2_reduction IS NULL
       OR p_verified_co2_reduction < 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Verified CO2 reduction must be zero or greater';

    END IF;

    IF p_credits_used IS NULL
       OR p_credits_used < 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Credits used must be zero or greater';

    END IF;

    IF p_credits_used > p_verified_co2_reduction THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Credits used cannot exceed verified CO2 reduction';

    END IF;

    SELECT
        status,
        owner_id
    INTO
        v_project_status,
        v_owner_id
    FROM carbon_projects
    WHERE project_id = p_project_id
    FOR UPDATE;

    IF v_project_status IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Project not found';

    END IF;

    IF v_project_status <> 'IN_PROGRESS' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Project is not in progress';

    END IF;

    SET v_remaining_credits =
        p_verified_co2_reduction - p_credits_used;

    INSERT INTO project_completion_reports
    (
        project_id,
        verifier_id,
        actual_co2_reduction,
        credits_used,
        completion_status,
        remarks,
        verified_at
    )
    VALUES
    (
        p_project_id,
        p_verifier_id,
        p_verified_co2_reduction,
        p_credits_used,
        'APPROVED',
        p_remarks,
        CURRENT_TIMESTAMP
    );

    INSERT INTO project_verifications
    (
        project_id,
        verifier_id,
        verification_stage,
        verified_co2_reduction,
        credits_used,
        status,
        remarks,
        verified_at
    )
    VALUES
    (
        p_project_id,
        p_verifier_id,
        'COMPLETION_REVIEW',
        p_verified_co2_reduction,
        p_credits_used,
        'APPROVED',
        p_remarks,
        CURRENT_TIMESTAMP
    );

    INSERT INTO credit_usage_reports
    (
        project_id,
        company_id,
        credits_used,
        usage_date,
        remarks
    )
    VALUES
    (
        p_project_id,
        v_owner_id,
        p_credits_used,
        CURRENT_DATE,
        CONCAT(
            'Credits used for project completion. ',
            'Remaining verified credits: ',
            v_remaining_credits
        )
    );

    UPDATE carbon_projects
    SET
        status = 'COMPLETED',
        updated_at = CURRENT_TIMESTAMP
    WHERE project_id = p_project_id;

    SELECT
        p_project_id AS project_id,
        p_verified_co2_reduction AS verified_co2_reduction,
        p_credits_used AS credits_used,
        v_remaining_credits AS remaining_credits,
        'COMPLETED' AS project_status;

END$$

DELIMITER ;

DELIMITER ;
SHOW PROCEDURE STATUS
WHERE Db = 'carbon';
SHOW TRIGGERS FROM carbon;