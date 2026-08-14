USE carbon;

SET @@auto_increment_increment=1;

SET SQL_SAFE_UPDATES = 0;

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM price_predictions;
DELETE FROM market_data;
DELETE FROM credit_retirements;
DELETE FROM transactions;
DELETE FROM marketplace_listings;
DELETE FROM blockchain_tokens;
DELETE FROM carbon_credits;
DELETE FROM project_verifications;
DELETE FROM project_documents;
DELETE FROM carbon_projects;
DELETE FROM users;
DELETE FROM token_transfers;

SET FOREIGN_KEY_CHECKS = 1;

ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE carbon_projects AUTO_INCREMENT = 1;
ALTER TABLE project_documents AUTO_INCREMENT = 1;
ALTER TABLE project_verifications AUTO_INCREMENT = 1;
ALTER TABLE carbon_credits AUTO_INCREMENT = 1;
ALTER TABLE blockchain_tokens AUTO_INCREMENT = 1;
ALTER TABLE token_transfers AUTO_INCREMENT = 1;
ALTER TABLE marketplace_listings AUTO_INCREMENT = 1;
ALTER TABLE transactions AUTO_INCREMENT = 1;
ALTER TABLE credit_retirements AUTO_INCREMENT = 1;
ALTER TABLE market_data AUTO_INCREMENT = 1;
ALTER TABLE price_predictions AUTO_INCREMENT = 1;

INSERT INTO users
(
	user_id,
    full_name,
    email,
    password_hash,
    role,
    company_name,
    wallet_address,
    country,
    account_status
)
VALUES
(
	1,
    'System Administrator',
    'admin@carbon.com',
    '$2b$12$abcdefghijklmnopqrstuu123456789012345678901234567890',
    'ADMIN',
    'Carbon Credit Platform',
    '0x1111111111111111111111111111111111111111',
    'India',
    'ACTIVE'
),
(
	2,
    'Arjun Reddy',
    'arjun@greenpower.com',
    '$2b$12$abcdefghijklmnopqrstuu123456789012345678901234567890',
    'SELLER',
    'GreenPower Energy Pvt Ltd',
    '0x2222222222222222222222222222222222222222',
    'India',
    'ACTIVE'
),
(
	3,
    'Priya Sharma',
    'priya@ecoforest.com',
    '$2b$12$abcdefghijklmnopqrstuu123456789012345678901234567890',
    'SELLER',
    'EcoForest Solutions',
    '0x3333333333333333333333333333333333333333',
    'India',
    'ACTIVE'
),
(
	4,
    'Rahul Kumar',
    'rahul@windenergy.com',
    '$2b$12$abcdefghijklmnopqrstuu123456789012345678901234567890',
    'SELLER',
    'WindEnergy Corporation',
    '0x4444444444444444444444444444444444444444',
    'India',
    'ACTIVE'
),
(
	5,
    'Meera Industries',
    'meera@meeraindustries.com',
    '$2b$12$abcdefghijklmnopqrstuu123456789012345678901234567890',
    'BUYER',
    'Meera Industries Ltd',
    '0x5555555555555555555555555555555555555555',
    'India',
    'ACTIVE'
),
(
	6,
    'Global Manufacturing',
    'buyer@globalmanufacturing.com',
    '$2b$12$abcdefghijklmnopqrstuu123456789012345678901234567890',
    'BUYER',
    'Global Manufacturing Ltd',
    '0x6666666666666666666666666666666666666666',
    'India',
    'ACTIVE'
),
(	7,
    'FutureTech Industries',
    'futuretech@carbon.com',
    '$2b$12$abcdefghijklmnopqrstuu123456789012345678901234567890',
    'BUYER',
    'FutureTech Industries',
    '0x7777777777777777777777777777777777777777',
    'India',
    'ACTIVE'
),
(
    9,
    'Carbon Verification Authority',
    'verifier@carbon.com',
    '$2b$12$abcdefghijklmnopqrstuu123456789012345678901234567890',
    'VERIFIER',
    'Carbon Verification Authority',
    '0x99999999999999999999999999999999999',
    'India',
    'ACTIVE'
);


INSERT INTO carbon_projects
(
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
VALUES
(
    2,
    'GreenPower Solar Farm',
    'Renewable Energy',
    'Large-scale solar power generation project designed to reduce dependence on fossil fuel based electricity.',
    'Rajasthan, India',
    5200.00,
    '2026-01-01',
    '2026-12-31',
    'CREDITS_ISSUED'
),
(
    2,
    'Industrial Solar Rooftop Project',
    'Renewable Energy',
    'Rooftop solar installation for industrial facilities to reduce grid electricity consumption.',
    'Telangana, India',
    2800.00,
    '2026-02-01',
    '2026-12-31',
    'APPROVED'
),
(
    3,
    'EcoForest Reforestation Project',
    'Forestry',
    'Reforestation initiative focused on restoring degraded land and increasing carbon sequestration.',
    'Andhra Pradesh, India',
    4100.00,
    '2026-01-15',
    '2030-12-31',
    'CREDITS_ISSUED'
),
(
    4,
    'Coastal Wind Energy Project',
    'Wind Energy',
    'Wind power generation project producing renewable electricity and reducing fossil fuel emissions.',
    'Tamil Nadu, India',
    6700.00,
    '2026-03-01',
    '2026-12-31',
    'CREDITS_ISSUED'
),
(
    3,
    'Organic Waste Management Project',
    'Waste Management',
    'Organic waste treatment project designed to reduce methane emissions from unmanaged waste.',
    'Karnataka, India',
    1900.00,
    '2026-04-01',
    '2026-12-31',
    'SUBMITTED'
);

INSERT INTO project_documents
(
    project_id,
    document_name,
    document_type,
    file_url
)
VALUES
(
    1,
    'Solar Farm Verification Report.pdf',
    'VERIFICATION_REPORT',
    'https://example.com/documents/solar-farm-verification.pdf'
),
(
    1,
    'Solar Farm Environmental Assessment.pdf',
    'ENVIRONMENTAL_REPORT',
    'https://example.com/documents/solar-farm-environment.pdf'
),
(
    2,
    'Rooftop Solar Project Proposal.pdf',
    'PROJECT_PROPOSAL',
    'https://example.com/documents/rooftop-solar-proposal.pdf'
),
(
    3,
    'EcoForest Land Assessment.pdf',
    'LAND_ASSESSMENT',
    'https://example.com/documents/ecoforest-land.pdf'
),
(
    3,
    'Forest Carbon Assessment.pdf',
    'CARBON_ASSESSMENT',
    'https://example.com/documents/ecoforest-carbon.pdf'
),
(
    4,
    'Wind Energy Environmental Report.pdf',
    'ENVIRONMENTAL_REPORT',
    'https://example.com/documents/wind-energy-environment.pdf'
),
(
    5,
    'Waste Management Project Proposal.pdf',
    'PROJECT_PROPOSAL',
    'https://example.com/documents/waste-project-proposal.pdf'
);

INSERT INTO project_verifications
(
    project_id,
    verifier_id,
    verified_co2_reduction,
    status,
    remarks
)
VALUES
(
    1,
    1,
    5000.00,
    'APPROVED',
    'Project documents verified and emission reduction estimate approved.'
),
(
    2,
    1,
    2600.00,
    'APPROVED',
    'Project approved after reviewing energy generation estimates.'
),
(
    3,
    1,
    3900.00,
    'APPROVED',
    'Forest restoration methodology and carbon estimation verified.'
),
(
    4,
    1,
    6400.00,
    'APPROVED',
    'Wind energy project approved after verification.'
);

INSERT INTO carbon_credits
(
    project_id,
    verification_id,
    quantity,
    vintage_year,
    issue_date,
    status
)
VALUES
(
    1,
    1,
    5000,
    2026,
    '2026-06-01',
    'TOKENIZED'
),
(
    3,
    3,
    3900,
    2026,
    '2026-06-10',
    'TOKENIZED'
),
(
    4,
    4,
    6400,
    2026,
    '2026-06-20',
    'TOKENIZED'
);

INSERT INTO blockchain_tokens
(
    credit_id,
    on_chain_token_id,
    contract_address,
    blockchain_network,
    mint_transaction_hash,
    initial_owner_wallet,
    minted_quantity,
    status
)
VALUES
(
    1,
    1001,
    '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'Polygon Amoy',
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '0x2222222222222222222222222222222222222222',
    5000,
    'ACTIVE'
),
(
    2,
    1002,
    '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'Polygon Amoy',
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    '0x3333333333333333333333333333333333333333',
    3900,
    'ACTIVE'
),
(
    3,
    1003,
    '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'Polygon Amoy',
    '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    '0x4444444444444444444444444444444444444444',
    6400,
    'ACTIVE'
);

INSERT INTO token_transfers
(
    blockchain_token_id,
    from_wallet,
    to_wallet,
    quantity,
    transaction_hash,
    block_number,
    transfer_type,
    transferred_at
)
VALUES
(
    1,
    '0x0000000000000000000000000000000000000000',
    '0x2222222222222222222222222222222222222222',
    5000,
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    100001,
    'MINT',
    '2026-06-01 10:00:00'
),
(
    2,
    '0x0000000000000000000000000000000000000000',
    '0x3333333333333333333333333333333333333333',
    3900,
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    100002,
    'MINT',
    '2026-06-10 11:00:00'
),
(
    3,
    '0x0000000000000000000000000000000000000000',
    '0x4444444444444444444444444444444444444444',
    6400,
    '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    100003,
    'MINT',
    '2026-06-20 12:00:00'
),
(
    1,
    '0x2222222222222222222222222222222222222222',
    '0x5555555555555555555555555555555555555555',
    200,
    '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    100101,
    'TRANSFER',
    '2026-07-01 10:30:00'
),
(
    1,
    '0x2222222222222222222222222222222222222222',
    '0x6666666666666666666666666666666666666666',
    150,
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    100102,
    'TRANSFER',
    '2026-07-05 14:20:00'
),
(
    2,
    '0x3333333333333333333333333333333333333333',
    '0x5555555555555555555555555555555555555555',
    100,
    '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    100103,
    'TRANSFER',
    '2026-07-10 09:45:00'
),
(
    3,
    '0x4444444444444444444444444444444444444444',
    '0x7777777777777777777777777777777777777777',
    300,
    '0x1212121212121212121212121212121212121212121212121212121212121212',
    100104,
    'TRANSFER',
    '2026-07-15 16:10:00'
);

INSERT INTO marketplace_listings
(
    seller_id,
    blockchain_token_id,
    quantity_listed,
    quantity_available,
    price_per_credit,
    status,
    expires_at
)
VALUES
(
    2,
    1,
    1000,
    1000,
    720.00,
    'ACTIVE',
    '2026-12-31'
),
(
    3,
    2,
    800,
    800,
    690.00,
    'ACTIVE',
    '2026-12-31'
),
(
    4,
    3,
    1200,
    1200,
    750.00,
    'ACTIVE',
    '2026-12-31'
);

INSERT INTO transactions
(
    listing_id,
    buyer_id,
    seller_id,
    blockchain_token_id,
    quantity,
    price_per_credit,
    total_amount,
    blockchain_tx_hash,
    transaction_status,
    transaction_date
)
VALUES
(
    1,
    5,
    2,
    1,
    200,
    720.00,
    144000.00,
    '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    'SUCCESSFUL',
    '2026-07-01 10:30:00'
),
(
    1,
    6,
    2,
    1,
    150,
    720.00,
    108000.00,
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    'SUCCESSFUL',
    '2026-07-05 14:20:00'
),
(
    2,
    5,
    3,
    2,
    100,
    690.00,
    69000.00,
    '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    'SUCCESSFUL',
    '2026-07-10 09:45:00'
),
(
    3,
    7,
    4,
    3,
    300,
    750.00,
    225000.00,
    '0x1212121212121212121212121212121212121212121212121212121212121212',
    'SUCCESSFUL',
    '2026-07-15 16:10:00'
),
(
    3,
    6,
    4,
    3,
    100,
    750.00,
    75000.00,
    NULL,
    'PENDING',
    '2026-07-20 11:00:00'
);

UPDATE marketplace_listings
SET quantity_available = 650
WHERE listing_id = 1;

UPDATE marketplace_listings
SET quantity_available = 700
WHERE listing_id = 2;

UPDATE marketplace_listings
SET quantity_available = 900
WHERE listing_id = 3;

INSERT INTO credit_retirements
(
    user_id,
    blockchain_token_id,
    quantity,
    reason,
    beneficiary,
    blockchain_tx_hash,
    retired_at
)
VALUES
(
    5,
    1,
    50,
    'Corporate carbon offset',
    'Meera Industries Ltd',
    '0x3434343434343434343434343434343434343434343434343434343434343434',
    '2026-07-18 12:00:00'
),
(
    6,
    1,
    75,
    'Annual emissions compensation',
    'Global Manufacturing Ltd',
    '0x4545454545454545454545454545454545454545454545454545454545454545',
    '2026-07-22 15:30:00'
),
(
    5,
    2,
    25,
    'Operational emission offset',
    'Meera Industries Ltd',
    '0x5656565656565656565656565656565656565656565656565656565656565656',
    '2026-07-25 10:15:00'
);

INSERT INTO market_data
(
    recorded_at,
    average_price,
    demand,
    supply,
    trading_volume
)
VALUES
(
    '2026-01-01',
    620.00,
    850,
    1400,
    450
),
(
    '2026-02-01',
    635.00,
    920,
    1350,
    520
),
(
    '2026-03-01',
    650.00,
    1000,
    1320,
    600
),
(
    '2026-04-01',
    665.00,
    1080,
    1280,
    680
),
(
    '2026-05-01',
    680.00,
    1150,
    1200,
    760
),
(
    '2026-06-01',
    695.00,
    1250,
    1150,
    850
),
(
    '2026-07-01',
    715.00,
    1380,
    1100,
    980
),
(
    '2026-08-01',
    730.00,
    1450,
    1050,
    1100
);

INSERT INTO price_predictions
(
    generated_at,
    target_date,
    current_price,
    predicted_price,
    model_name,
    model_version,
    confidence_score
)
VALUES
(
    '2026-07-01 09:00:00',
    '2026-07-08',
    715.00,
    724.00,
    'Random Forest',
    '1.0',
    82.50
),
(
    '2026-07-08 09:00:00',
    '2026-07-15',
    724.00,
    738.00,
    'Random Forest',
    '1.0',
    84.20
),
(
    '2026-07-15 09:00:00',
    '2026-07-22',
    738.00,
    750.00,
    'XGBoost',
    '1.0',
    87.30
),
(
    '2026-07-22 09:00:00',
    '2026-07-29',
    750.00,
    762.00,
    'XGBoost',
    '1.0',
    88.10
),
(
    '2026-07-29 09:00:00',
    '2026-08-05',
    762.00,
    775.00,
    'XGBoost',
    '1.1',
    89.40
);

SELECT * FROM users;

SELECT * FROM carbon_projects;

SELECT * FROM project_documents;

SELECT * FROM project_verifications;

SELECT * FROM carbon_credits;

SELECT * FROM blockchain_tokens;

SELECT * FROM token_transfers;

SELECT * FROM marketplace_listings;

SELECT * FROM transactions;

SELECT * FROM credit_retirements;

SELECT * FROM market_data;

SELECT * FROM price_predictions;