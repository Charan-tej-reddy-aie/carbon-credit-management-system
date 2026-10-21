USE carbon_v2;

DROP TRIGGER IF EXISTS trg_transaction_total_insert;
DROP TRIGGER IF EXISTS trg_transaction_total_update;
DROP TRIGGER IF EXISTS trg_listing_status_insert;
DROP TRIGGER IF EXISTS trg_listing_status_update;
DROP TRIGGER IF EXISTS trg_retirement_validation;

DROP PROCEDURE IF EXISTS sp_create_project;
DROP PROCEDURE IF EXISTS sp_verify_project;
DROP PROCEDURE IF EXISTS sp_complete_project;
DROP PROCEDURE IF EXISTS sp_issue_credits;
DROP PROCEDURE IF EXISTS sp_get_company_credit_summary;
DROP PROCEDURE IF EXISTS sp_create_listing;
DROP PROCEDURE IF EXISTS sp_purchase_credits;
DROP PROCEDURE IF EXISTS sp_approve_credit_price;
DROP PROCEDURE IF EXISTS sp_request_price_change;
DROP PROCEDURE IF EXISTS sp_review_price_change;
DROP PROCEDURE IF EXISTS sp_retire_credits;

DELIMITER $$

-- ============================================================
-- 1. CREATE PROJECT
-- Input uses user_id so the existing authentication layer
-- does not need to change immediately.
-- ============================================================
CREATE PROCEDURE sp_create_project(
    IN p_owner_user_id INT,
    IN p_project_name VARCHAR(200),
    IN p_project_type VARCHAR(100),
    IN p_description TEXT,
    IN p_location VARCHAR(200),
    IN p_estimated_co2 DECIMAL(12,2),
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    DECLARE v_role_name VARCHAR(30);
    DECLARE v_company_id INT;
    DECLARE v_project_type_id INT;
    DECLARE v_project_id INT;
    DECLARE v_credit_difference DECIMAL(14,2) DEFAULT 0;

    SELECT r.role_name, c.company_id
    INTO v_role_name, v_company_id
    FROM users u
    JOIN roles r ON r.role_id = u.role_id
    LEFT JOIN companies c ON c.user_id = u.user_id
    WHERE u.user_id = p_owner_user_id;

    IF v_role_name IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'User does not exist';
    END IF;

    IF v_role_name <> 'COMPANY' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Only companies can create carbon projects';
    END IF;

    IF v_company_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Company profile does not exist';
    END IF;

    IF p_project_name IS NULL OR TRIM(p_project_name) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Project name is required';
    END IF;

    IF p_project_type IS NULL OR TRIM(p_project_type) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Project type is required';
    END IF;

    SELECT project_type_id
    INTO v_project_type_id
    FROM project_types
    WHERE LOWER(TRIM(type_name)) = LOWER(TRIM(p_project_type))
    LIMIT 1;

    IF v_project_type_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid project type';
    END IF;

    IF p_estimated_co2 IS NULL OR p_estimated_co2 <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Estimated CO2 reduction must be greater than zero';
    END IF;

    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Start date and end date are required';
    END IF;

    IF p_end_date <= p_start_date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'End date must be after start date';
    END IF;

    /*
      Preserve the existing business rule:
      current holdings minus reported usage must not be negative.
    */
    SELECT
        COALESCE(SUM(h.quantity_owned), 0)
        - COALESCE((
            SELECT SUM(cur.credits_used)
            FROM credit_usage_reports cur
            JOIN project_completion_reports pcr
              ON pcr.completion_id = cur.completion_id
            JOIN carbon_projects cp2
              ON cp2.project_id = pcr.project_id
            WHERE cp2.owner_company_id = v_company_id
        ), 0)
    INTO v_credit_difference
    FROM company_credit_holdings h
    WHERE h.company_id = v_company_id;

    IF v_credit_difference < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Company has a credit deficit. Purchase carbon credits before creating a new project';
    END IF;

    INSERT INTO carbon_projects (
        owner_company_id,
        project_type_id,
        project_name,
        description,
        location,
        estimated_co2_reduction,
        start_date,
        end_date,
        status
    )
    VALUES (
        v_company_id,
        v_project_type_id,
        p_project_name,
        p_description,
        p_location,
        p_estimated_co2,
        p_start_date,
        p_end_date,
        'SUBMITTED'
    );

    SET v_project_id = LAST_INSERT_ID();

    INSERT INTO verification_notifications (
        project_id,
        verifier_id,
        notification_type,
        notification_status
    )
    SELECT
        v_project_id,
        u.user_id,
        'START_APPROVAL',
        'PENDING'
    FROM users u
    JOIN roles r ON r.role_id = u.role_id
    WHERE r.role_name = 'VERIFIER'
      AND u.account_status = 'ACTIVE'
    ORDER BY u.user_id
    LIMIT 1;

    SELECT v_project_id AS project_id;
END$$

-- ============================================================
-- 2. START APPROVAL / PROJECT VERIFICATION
-- ============================================================
CREATE PROCEDURE sp_verify_project(
    IN p_project_id INT,
    IN p_verifier_user_id INT,
    IN p_verified_co2 DECIMAL(12,2),
    IN p_status VARCHAR(20),
    IN p_remarks TEXT
)
BEGIN
    DECLARE v_role_name VARCHAR(30);
    DECLARE v_project_status VARCHAR(30);
    DECLARE v_notification_id INT DEFAULT NULL;
    DECLARE v_verification_id INT;
    DECLARE v_status VARCHAR(20);

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
        SET MESSAGE_TEXT = 'Only verifiers can verify projects';
    END IF;

    SELECT status
    INTO v_project_status
    FROM carbon_projects
    WHERE project_id = p_project_id;

    IF v_project_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Project does not exist';
    END IF;

    IF v_project_status NOT IN ('SUBMITTED','UNDER_REVIEW') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Project is not available for start approval';
    END IF;

    SET v_status = UPPER(TRIM(p_status));

    IF v_status NOT IN ('APPROVED','REJECTED') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid verification status';
    END IF;

    IF v_status = 'APPROVED'
       AND (p_verified_co2 IS NULL OR p_verified_co2 <= 0) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Approved projects must have positive verified CO2 reduction';
    END IF;

    IF v_status = 'REJECTED' AND p_verified_co2 IS NULL THEN
        SET p_verified_co2 = 0;
    END IF;

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
        'START_APPROVAL',
        p_verified_co2,
        NULL,
        v_status,
        p_remarks
    );

    SET v_verification_id = LAST_INSERT_ID();

    IF v_status = 'APPROVED' THEN
        UPDATE carbon_projects
        SET status = 'IN_PROGRESS'
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
      AND verifier_id = p_verifier_user_id
      AND notification_type = 'START_APPROVAL'
      AND notification_status = 'PENDING'
    ORDER BY notification_id
    LIMIT 1;

    IF v_notification_id IS NOT NULL THEN
        UPDATE verification_notifications
        SET notification_status = 'COMPLETED',
            completed_at = CURRENT_TIMESTAMP
        WHERE notification_id = v_notification_id;
    END IF;

    IF v_status = 'APPROVED' THEN
        INSERT INTO verification_notifications (
            project_id,
            verifier_id,
            notification_type,
            notification_status
        )
        VALUES (
            p_project_id,
            p_verifier_user_id,
            'COMPLETION_REVIEW',
            'PENDING'
        );
    END IF;

    SELECT v_verification_id AS verification_id;
END$$

-- ============================================================
-- 3. COMPLETE PROJECT
-- ============================================================
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
        SET notification_status = 'COMPLETED',
            completed_at = CURRENT_TIMESTAMP
        WHERE notification_id = v_notification_id;
    END IF;

    COMMIT;

    SELECT
        v_completion_id AS completion_id,
        v_verification_id AS verification_id;
END$$

-- ============================================================
-- 4. ISSUE CARBON CREDITS
-- ============================================================
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
    DECLARE v_project_status VARCHAR(30);
    DECLARE v_company_id INT;
    DECLARE v_existing_credits INT DEFAULT 0;
    DECLARE v_credit_id INT;

    SELECT
        project_id,
        status,
        verification_stage
    INTO
        v_verification_project,
        v_verification_status,
        v_verification_stage
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

    IF v_verification_stage <> 'START_APPROVAL' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Credits must be issued using the start approval verification';
    END IF;

    IF v_verification_status <> 'APPROVED' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Credits can only be issued for approved verification';
    END IF;

    SELECT status, owner_company_id
    INTO v_project_status, v_company_id
    FROM carbon_projects
    WHERE project_id = p_project_id;

    IF v_project_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Project does not exist';
    END IF;

    IF v_project_status NOT IN (
        'APPROVED',
        'IN_PROGRESS',
        'COMPLETED',
        'CREDITS_ISSUED'
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Project is not approved for credit issuance';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Credit quantity must be greater than zero';
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
        verification_id,
        quantity,
        vintage_year,
        issue_date,
        status
    )
    VALUES (
        p_verification_id,
        p_quantity,
        p_year,
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
        v_company_id,
        v_credit_id,
        p_quantity
    );

    UPDATE carbon_projects
    SET status = 'CREDITS_ISSUED'
    WHERE project_id = p_project_id;

    SELECT v_credit_id AS credit_id;
END$$

-- ============================================================
-- 5. COMPANY CREDIT SUMMARY
-- ============================================================
CREATE PROCEDURE sp_get_company_credit_summary(
    IN p_company_user_id INT
)
BEGIN
    DECLARE v_company_id INT;

    SELECT company_id
    INTO v_company_id
    FROM companies
    WHERE user_id = p_company_user_id;

    IF v_company_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Company profile does not exist';
    END IF;

    SELECT
        c.company_id,
        u.full_name,
        c.company_name,
        COALESCE(SUM(h.quantity_owned), 0) AS registered_credits,
        COALESCE((
            SELECT SUM(cur.credits_used)
            FROM credit_usage_reports cur
            JOIN project_completion_reports pcr
              ON pcr.completion_id = cur.completion_id
            JOIN carbon_projects cp
              ON cp.project_id = pcr.project_id
            WHERE cp.owner_company_id = c.company_id
        ), 0) AS reported_credits,
        (
            COALESCE(SUM(h.quantity_owned), 0)
            -
            COALESCE((
                SELECT SUM(cur.credits_used)
                FROM credit_usage_reports cur
                JOIN project_completion_reports pcr
                  ON pcr.completion_id = cur.completion_id
                JOIN carbon_projects cp
                  ON cp.project_id = pcr.project_id
                WHERE cp.owner_company_id = c.company_id
            ), 0)
        ) AS credit_difference,
        CASE
            WHEN (
                COALESCE(SUM(h.quantity_owned), 0)
                -
                COALESCE((
                    SELECT SUM(cur.credits_used)
                    FROM credit_usage_reports cur
                    JOIN project_completion_reports pcr
                      ON pcr.completion_id = cur.completion_id
                    JOIN carbon_projects cp
                      ON cp.project_id = pcr.project_id
                    WHERE cp.owner_company_id = c.company_id
                ), 0)
            ) >= 0 THEN 'ELIGIBLE'
            ELSE 'BLOCKED'
        END AS project_creation_status
    FROM companies c
    JOIN users u ON u.user_id = c.user_id
    LEFT JOIN company_credit_holdings h
      ON h.company_id = c.company_id
    WHERE c.user_id = p_company_user_id
    GROUP BY c.company_id, u.full_name, c.company_name;
END$$

-- ============================================================
-- 6. CREATE MARKETPLACE LISTING
-- ============================================================
CREATE PROCEDURE sp_create_listing(
    IN p_company_user_id INT,
    IN p_token_id INT,
    IN p_quantity INT,
    IN p_price_approval_id INT,
    IN p_expiry DATE
)
BEGIN
    DECLARE v_role_name VARCHAR(30);
    DECLARE v_company_id INT;
    DECLARE v_wallet VARCHAR(42);
    DECLARE v_available_surplus INT DEFAULT 0;
    DECLARE v_approved_price DECIMAL(10,2);
    DECLARE v_approval_project INT;
    DECLARE v_approval_status VARCHAR(20);
    DECLARE v_token_status VARCHAR(20);
    DECLARE v_token_project INT;
    DECLARE v_project_owner INT;
    DECLARE v_existing_listed INT DEFAULT 0;
    DECLARE v_listing_id INT;

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
        SET MESSAGE_TEXT = 'Company user does not exist';
    END IF;

    IF v_role_name <> 'COMPANY' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Only companies can create marketplace listings';
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
        SET MESSAGE_TEXT = 'Listing quantity must be greater than zero';
    END IF;

    SELECT project_id, price_per_credit, status
    INTO v_approval_project, v_approved_price, v_approval_status
    FROM credit_price_approvals
    WHERE price_approval_id = p_price_approval_id
    FOR UPDATE;

    IF v_approved_price IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Price approval does not exist';
    END IF;

    IF v_approval_status <> 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Price approval is not active';
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
        cp.project_id,
        cp.owner_company_id
    INTO
        v_token_project,
        v_project_owner
    FROM blockchain_tokens bt
    JOIN carbon_credits cc
      ON cc.credit_id = bt.credit_id
    JOIN project_verifications pv
      ON pv.verification_id = cc.verification_id
    JOIN carbon_projects cp
      ON cp.project_id = pv.project_id
    WHERE bt.blockchain_token_id = p_token_id;

    IF v_token_project IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Token is not linked to a valid project';
    END IF;

    IF v_project_owner <> v_company_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Company does not own the selected project credits';
    END IF;

    IF v_approval_project <> v_token_project THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Price approval does not belong to the selected project';
    END IF;

    SELECT
        GREATEST(
            COALESCE(SUM(h.quantity_owned), 0)
            -
            COALESCE((
                SELECT SUM(cur.credits_used)
                FROM credit_usage_reports cur
                JOIN project_completion_reports pcr
                  ON pcr.completion_id = cur.completion_id
                JOIN carbon_projects cp2
                  ON cp2.project_id = pcr.project_id
                WHERE cp2.owner_company_id = v_company_id
            ), 0),
            0
        )
    INTO v_available_surplus
    FROM company_credit_holdings h
    WHERE h.company_id = v_company_id;

    SELECT COALESCE(SUM(quantity_available), 0)
    INTO v_existing_listed
    FROM marketplace_listings
    WHERE seller_company_id = v_company_id
      AND blockchain_token_id = p_token_id
      AND status IN ('ACTIVE','PARTIALLY_SOLD');

    IF p_quantity > (v_available_surplus - v_existing_listed) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient available surplus credits for listing';
    END IF;

    START TRANSACTION;

    INSERT INTO marketplace_listings (
        seller_company_id,
        blockchain_token_id,
        quantity_listed,
        quantity_available,
        price_approval_id,
        status,
        expires_at
    )
    VALUES (
        v_company_id,
        p_token_id,
        p_quantity,
        p_quantity,
        p_price_approval_id,
        'ACTIVE',
        p_expiry
    );

    SET v_listing_id = LAST_INSERT_ID();

    COMMIT;

    SELECT v_listing_id AS listing_id;
END$$

-- ============================================================
-- 7. PURCHASE CREDITS
-- ============================================================
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
        SET p_blockchain_tx_hash = CONCAT('0x', LOWER(HEX(RANDOM_BYTES(32))));
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
        p_blockchain_tx_hash,
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
        p_blockchain_tx_hash,
        FLOOR(18000000 + (RAND() * 500000)),
        'TRANSFER'
    );

    COMMIT;

    SELECT v_transaction_id AS transaction_id;
END$$

-- ============================================================
-- 8. APPROVE CREDIT PRICE
-- ============================================================
CREATE PROCEDURE sp_approve_credit_price(
    IN p_project_id INT,
    IN p_verifier_user_id INT,
    IN p_price DECIMAL(10,2)
)
BEGIN
    DECLARE v_role_name VARCHAR(30);
    DECLARE v_project_status VARCHAR(30);
    DECLARE v_price_id INT;

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
        SET MESSAGE_TEXT = 'Only verifiers can approve credit prices';
    END IF;

    SELECT status
    INTO v_project_status
    FROM carbon_projects
    WHERE project_id = p_project_id;

    IF v_project_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Project does not exist';
    END IF;

    IF p_price IS NULL OR p_price <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Price must be greater than zero';
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
        p_verifier_user_id,
        p_price,
        'ACTIVE'
    );

    SET v_price_id = LAST_INSERT_ID();

    SELECT v_price_id AS price_approval_id;
END$$

-- ============================================================
-- 9. REQUEST PRICE CHANGE
-- ============================================================
CREATE PROCEDURE sp_request_price_change(
    IN p_company_user_id INT,
    IN p_project_id INT,
    IN p_requested_price DECIMAL(10,2),
    IN p_description TEXT
)
BEGIN
    DECLARE v_role_name VARCHAR(30);
    DECLARE v_company_id INT;
    DECLARE v_owner_company_id INT;
    DECLARE v_current_price DECIMAL(10,2);

    SELECT r.role_name, c.company_id
    INTO v_role_name, v_company_id
    FROM users u
    JOIN roles r ON r.role_id = u.role_id
    LEFT JOIN companies c ON c.user_id = u.user_id
    WHERE u.user_id = p_company_user_id;

    IF v_role_name IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Company user does not exist';
    END IF;

    IF v_role_name <> 'COMPANY' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Only companies can request price changes';
    END IF;

    SELECT owner_company_id
    INTO v_owner_company_id
    FROM carbon_projects
    WHERE project_id = p_project_id;

    IF v_owner_company_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Project does not exist';
    END IF;

    IF v_owner_company_id <> v_company_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Company does not own this project';
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
        SET MESSAGE_TEXT = 'No active verifier-approved price exists';
    END IF;

    IF p_requested_price IS NULL OR p_requested_price <= v_current_price THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Requested price must be greater than the current price';
    END IF;

    IF p_description IS NULL OR TRIM(p_description) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Price increase description is required';
    END IF;

    INSERT INTO price_change_requests (
        project_id,
        requested_price,
        description,
        status
    )
    VALUES (
        p_project_id,
        p_requested_price,
        p_description,
        'PENDING'
    );

    SELECT LAST_INSERT_ID() AS request_id;
END$$

-- ============================================================
-- 10. REVIEW PRICE CHANGE
-- ============================================================
CREATE PROCEDURE sp_review_price_change(
    IN p_request_id INT,
    IN p_verifier_user_id INT,
    IN p_status VARCHAR(20)
)
BEGIN
    DECLARE v_role_name VARCHAR(30);
    DECLARE v_project_id INT;
    DECLARE v_requested_price DECIMAL(10,2);
    DECLARE v_request_status VARCHAR(20);
    DECLARE v_price_id INT;
    DECLARE v_status VARCHAR(20);

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
        SET MESSAGE_TEXT = 'Only verifiers can review price requests';
    END IF;

    SELECT project_id, requested_price, status
    INTO v_project_id, v_requested_price, v_request_status
    FROM price_change_requests
    WHERE request_id = p_request_id
    FOR UPDATE;

    IF v_request_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Price change request does not exist';
    END IF;

    IF v_request_status <> 'PENDING' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Price change request has already been reviewed';
    END IF;

    SET v_status = UPPER(TRIM(p_status));

    IF v_status NOT IN ('APPROVED','REJECTED') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid price request status';
    END IF;

    UPDATE price_change_requests
    SET verifier_id = p_verifier_user_id,
        status = v_status,
        reviewed_at = CURRENT_TIMESTAMP
    WHERE request_id = p_request_id;

    IF v_status = 'APPROVED' THEN
        UPDATE credit_price_approvals
        SET status = 'REPLACED'
        WHERE project_id = v_project_id
          AND status = 'ACTIVE';

        INSERT INTO credit_price_approvals (
            project_id,
            verifier_id,
            price_per_credit,
            status
        )
        VALUES (
            v_project_id,
            p_verifier_user_id,
            v_requested_price,
            'ACTIVE'
        );

        SET v_price_id = LAST_INSERT_ID();
    END IF;

    SELECT
        p_request_id AS request_id,
        v_status AS status,
        v_price_id AS price_approval_id;
END$$

-- ============================================================
-- 11. RETIRE CREDITS
-- ============================================================
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
        SET p_blockchain_tx_hash = CONCAT('0x', LOWER(HEX(RANDOM_BYTES(32))));
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
        p_blockchain_tx_hash
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
        p_blockchain_tx_hash,
        FLOOR(18000000 + (RAND() * 500000)),
        'TRANSFER'
    );

    COMMIT;

    SELECT v_retirement_id AS retirement_id;
END$$

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_transaction_total_insert
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    SET NEW.total_amount = NEW.quantity * NEW.price_per_credit;
END$$

CREATE TRIGGER trg_transaction_total_update
BEFORE UPDATE ON transactions
FOR EACH ROW
BEGIN
    SET NEW.total_amount = NEW.quantity * NEW.price_per_credit;
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

-- ============================================================
-- VALIDATION
-- ============================================================
USE carbon_v2;

SHOW PROCEDURE STATUS
WHERE Db = 'carbon_v2';

SHOW TRIGGERS FROM carbon_v2;
