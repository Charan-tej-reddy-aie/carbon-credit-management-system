-- ============================================================
-- CARBONX - NORMALIZED SAMPLE SEED DATA (carbon_v2)
-- Clean, reproducible test data for demonstration & evaluation
-- ============================================================

USE carbon_v2;

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM roles;
ALTER TABLE roles AUTO_INCREMENT = 1;
DELETE FROM project_types;
ALTER TABLE project_types AUTO_INCREMENT = 1;
DELETE FROM users;
ALTER TABLE users AUTO_INCREMENT = 1;
DELETE FROM companies;
ALTER TABLE companies AUTO_INCREMENT = 1;
DELETE FROM carbon_projects;
ALTER TABLE carbon_projects AUTO_INCREMENT = 1;
DELETE FROM project_documents;
ALTER TABLE project_documents AUTO_INCREMENT = 1;
DELETE FROM project_verifications;
ALTER TABLE project_verifications AUTO_INCREMENT = 1;
DELETE FROM verification_notifications;
ALTER TABLE verification_notifications AUTO_INCREMENT = 1;
DELETE FROM project_completion_reports;
ALTER TABLE project_completion_reports AUTO_INCREMENT = 1;
DELETE FROM carbon_credits;
ALTER TABLE carbon_credits AUTO_INCREMENT = 1;
DELETE FROM company_credit_holdings;
ALTER TABLE company_credit_holdings AUTO_INCREMENT = 1;
DELETE FROM blockchain_tokens;
ALTER TABLE blockchain_tokens AUTO_INCREMENT = 1;
DELETE FROM token_transfers;
ALTER TABLE token_transfers AUTO_INCREMENT = 1;
DELETE FROM credit_usage_reports;
ALTER TABLE credit_usage_reports AUTO_INCREMENT = 1;
DELETE FROM credit_price_approvals;
ALTER TABLE credit_price_approvals AUTO_INCREMENT = 1;
DELETE FROM price_change_requests;
ALTER TABLE price_change_requests AUTO_INCREMENT = 1;
DELETE FROM marketplace_listings;
ALTER TABLE marketplace_listings AUTO_INCREMENT = 1;
DELETE FROM transactions;
ALTER TABLE transactions AUTO_INCREMENT = 1;
DELETE FROM credit_retirements;
ALTER TABLE credit_retirements AUTO_INCREMENT = 1;
DELETE FROM market_data;
ALTER TABLE market_data AUTO_INCREMENT = 1;
DELETE FROM price_predictions;
ALTER TABLE price_predictions AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- Table: roles (3 records)
-- ------------------------------------------------------------
INSERT INTO roles (role_id, role_name) VALUES
(1, 'ADMIN'),
(2, 'COMPANY'),
(3, 'VERIFIER');

-- ------------------------------------------------------------
-- Table: project_types (5 records)
-- ------------------------------------------------------------
INSERT INTO project_types (project_type_id, type_name, description) VALUES
(1, 'Forestry', NULL),
(2, 'Renewable Energy', NULL),
(3, 'Waste Management', NULL),
(4, 'Wind Energy', NULL),
(5, 'Energy Efficiency', 'Energy conservation and efficiency projects');

-- ------------------------------------------------------------
-- Table: users (14 records)
-- ------------------------------------------------------------
INSERT INTO users (user_id, full_name, email, password_hash, role_id, wallet_address, country, account_status, created_at, updated_at) VALUES
(1, 'System Administrator', 'admin@carbon.com', '$2b$10$J4mFa1Z2gN8rhzIjBITKQOQ9MpkhL8ukDVBov4pkMOmHkMC25WZfG', 1, '0x1111111111111111111111111111111111111111', 'India', 'ACTIVE', '2026-08-20 04:03:32', '2026-10-03 06:52:31'),
(2, 'Arjun Reddy', 'arjun@greenpower.com', '$2b$10$CwfuJZIKZgcFSbATffs1Mu4WSTGBUeRlsbq.9bJhIO3hID/oxwk9C', 2, '0x2222222222222222222222222222222222222222', 'India', 'ACTIVE', '2026-08-20 04:03:32', '2026-10-03 06:52:33'),
(3, 'Priya Sharma', 'priya@ecoforest.com', '$2b$10$CwfuJZIKZgcFSbATffs1Mu4WSTGBUeRlsbq.9bJhIO3hID/oxwk9C', 2, '0x3333333333333333333333333333333333333333', 'India', 'ACTIVE', '2026-08-20 04:03:32', '2026-08-20 06:06:01'),
(4, 'Rahul Kumar', 'rahul@windenergy.com', '$2b$10$CwfuJZIKZgcFSbATffs1Mu4WSTGBUeRlsbq.9bJhIO3hID/oxwk9C', 2, '0x4444444444444444444444444444444444444444', 'India', 'ACTIVE', '2026-08-20 04:03:32', '2026-08-20 06:06:09'),
(5, 'Meera Industries', 'meera@meeraindustries.com', '$2b$10$CwfuJZIKZgcFSbATffs1Mu4WSTGBUeRlsbq.9bJhIO3hID/oxwk9C', 2, '0x5555555555555555555555555555555555555555', 'India', 'ACTIVE', '2026-08-20 04:03:32', '2026-08-20 06:06:11'),
(6, 'Global Manufacturing', 'buyer@globalmanufacturing.com', '$2b$10$CwfuJZIKZgcFSbATffs1Mu4WSTGBUeRlsbq.9bJhIO3hID/oxwk9C', 2, '0x6666666666666666666666666666666666666666', 'India', 'ACTIVE', '2026-08-20 04:03:32', '2026-08-20 04:03:32'),
(7, 'FutureTech Industries', 'futuretech@carbon.com', '$2b$10$CwfuJZIKZgcFSbATffs1Mu4WSTGBUeRlsbq.9bJhIO3hID/oxwk9C', 2, '0x7777777777777777777777777777777777777777', 'India', 'ACTIVE', '2026-08-20 04:03:32', '2026-08-20 04:03:32'),
(8, 'Amit Sharma', 'amit@carbontrust.org', '$2b$10$KAgJm5OYlmLwe2jJ3jUf..xPIt/iyYaKBOOfLvZwjbzMsae/cT8pa', 3, '0x8888888888888888888888888888888888888889', 'India', 'ACTIVE', '2026-08-20 04:03:32', '2026-10-03 06:52:35'),
(9, 'Carbon Verification Authority', 'verifier@carbon.com', '$2b$10$KAgJm5OYlmLwe2jJ3jUf..xPIt/iyYaKBOOfLvZwjbzMsae/cT8pa', 3, '0x9999999999999999999999999999999999999999', 'India', 'ACTIVE', '2026-08-20 04:03:32', '2026-10-03 06:52:35'),
(10, 'Amrutha', 'amrutha@aj.com', '$2b$10$CwfuJZIKZgcFSbATffs1Mu4WSTGBUeRlsbq.9bJhIO3hID/oxwk9C', 2, '0x8888888888888888888888888888888888888888', 'India', 'ACTIVE', '2026-08-20 04:12:28', '2026-10-06 12:46:11'),
(11, 'Lifecycle Tester', 'lifecycle_test_1792321985368@testcompany.com', '$2b$10$CwfuJZIKZgcFSbATffs1Mu4WSTGBUeRlsbq.9bJhIO3hID/oxwk9C', 2, '0x1122334455667788990011223344556677889900', 'India', 'ACTIVE', '2026-10-18 11:13:05', '2026-10-18 11:13:05'),
(13, 'Lifecycle Tester', 'lifecycle_test_1792322288965@testcompany.com', '$2b$10$CwfuJZIKZgcFSbATffs1Mu4WSTGBUeRlsbq.9bJhIO3hID/oxwk9C', 2, '0xa209dd556c399213904621d9d2b30bbffbafce8b', 'India', 'ACTIVE', '2026-10-18 11:18:09', '2026-10-18 11:18:09'),
(14, 'Lifecycle Tester', 'lifecycle_test_1792322329136@testcompany.com', '$2b$10$CwfuJZIKZgcFSbATffs1Mu4WSTGBUeRlsbq.9bJhIO3hID/oxwk9C', 2, '0xb43321c889eddb7f7f86f6b437667e37dace55d4', 'India', 'ACTIVE', '2026-10-18 11:18:49', '2026-10-18 11:18:49'),
(15, 'Lifecycle Tester', 'lifecycle_test_1792323107859@testcompany.com', '$2b$10$CwfuJZIKZgcFSbATffs1Mu4WSTGBUeRlsbq.9bJhIO3hID/oxwk9C', 2, '0xf2681329947ae99a9137421cd3f4352a2f482691', 'India', 'ACTIVE', '2026-10-18 11:31:47', '2026-10-18 11:31:47'),
(16, 'Lifecycle Tester', 'lifecycle_test_1792323213265@testcompany.com', '$2b$10$CwfuJZIKZgcFSbATffs1Mu4WSTGBUeRlsbq.9bJhIO3hID/oxwk9C', 2, '0x822d4812457121dd9bd6ae92b529abb92d022d66', 'India', 'ACTIVE', '2026-10-18 11:33:33', '2026-10-18 11:33:33');

-- ------------------------------------------------------------
-- Table: companies (12 records)
-- ------------------------------------------------------------
INSERT INTO companies (company_id, user_id, company_name) VALUES
(2, 2, 'GreenPower Energy Pvt Ltd'),
(3, 3, 'EcoForest Solutions'),
(4, 4, 'WindEnergy Corporation'),
(5, 5, 'Meera Industries Ltd'),
(6, 6, 'Global Manufacturing Ltd'),
(7, 7, 'FutureTech Industries'),
(10, 10, 'AJ'),
(11, 11, 'Lifecycle Test Energy 1792321985368'),
(12, 13, 'Lifecycle Test Energy 1792322288965'),
(13, 14, 'Lifecycle Test Energy 1792322329136'),
(14, 15, 'Lifecycle Test Energy 1792323107859'),
(15, 16, 'Lifecycle Test Energy 1792323213265');

-- ------------------------------------------------------------
-- Table: carbon_projects (14 records)
-- ------------------------------------------------------------
INSERT INTO carbon_projects (project_id, owner_company_id, project_type_id, project_name, description, location, estimated_co2_reduction, start_date, end_date, status, created_at, updated_at) VALUES
(1, 2, 2, 'GreenPower Solar Farm', 'Large-scale solar power generation project designed to reduce dependence on fossil fuel based electricity.', 'Rajasthan, India', '5200.00', '2025-12-31 18:30:00', '2026-12-30 18:30:00', 'CREDITS_ISSUED', '2026-08-20 04:03:32', '2026-08-20 04:03:32'),
(2, 2, 2, 'Industrial Solar Rooftop Project', 'Rooftop solar installation for industrial facilities to reduce grid electricity consumption.', 'Telangana, India', '2800.00', '2026-01-31 18:30:00', '2026-12-30 18:30:00', 'IN_PROGRESS', '2026-08-20 04:03:32', '2026-08-20 04:03:32'),
(3, 3, 1, 'EcoForest Reforestation Project', 'Reforestation initiative focused on restoring degraded land and increasing carbon sequestration.', 'Andhra Pradesh, India', '4100.00', '2026-01-14 18:30:00', '2030-12-30 18:30:00', 'CREDITS_ISSUED', '2026-08-20 04:03:32', '2026-08-20 04:03:32'),
(4, 4, 4, 'Coastal Wind Energy Project', 'Wind power generation project producing renewable electricity and reducing fossil fuel emissions.', 'Tamil Nadu, India', '6700.00', '2026-02-28 18:30:00', '2026-12-30 18:30:00', 'CREDITS_ISSUED', '2026-08-20 04:03:32', '2026-08-20 04:03:32'),
(5, 3, 3, 'Organic Waste Management Project', 'Organic waste treatment project designed to reduce methane emissions from unmanaged waste.', 'Karnataka, India', '1900.00', '2026-03-31 18:30:00', '2026-12-30 18:30:00', 'IN_PROGRESS', '2026-08-20 04:03:32', '2026-08-20 08:12:16'),
(6, 2, 2, 'Temporary Test Solar Project', 'Temporary project used to test the new company project workflow.', 'Andhra Pradesh, India', '1500.00', '2026-12-31 18:30:00', '2027-12-30 18:30:00', 'CREDITS_ISSUED', '2026-08-20 04:04:58', '2026-09-29 06:28:21'),
(7, 10, 2, 'sdfghjk', 'yryu', 'Hyderabad ', '2800.00', '2026-08-19 18:30:00', '2027-08-19 18:30:00', 'IN_PROGRESS', '2026-08-20 04:16:55', '2026-08-20 08:12:26'),
(8, 4, 4, 'Wind turbans in Amrita', 'vnovs', 'Coimbatore', '9000.00', '2026-08-21 18:30:00', '2027-08-19 18:30:00', 'SUBMITTED', '2026-08-20 06:19:50', '2026-08-20 06:19:50'),
(9, 2, 2, 'GreenPower Solar Expansion', 'Solar renewable energy project for reducing carbon emissions.', 'Kerala, India', '1000.00', '2026-10-02 18:30:00', '2027-10-02 18:30:00', 'CREDITS_ISSUED', '2026-10-03 17:13:25', '2026-10-03 18:13:04'),
(10, 10, 3, 'Solar Carbon Reduction Project', 'To decompose all the waste materials with less CO2 reduction', 'Andhra Pradesh, India', '3000.00', '2026-10-03 18:30:00', '2027-10-03 18:30:00', 'CREDITS_ISSUED', '2026-10-04 11:29:27', '2026-10-04 11:33:13'),
(11, 12, 2, 'Solar Lifecycle Project 1792322289197', 'Lifecycle solar generation project', 'Rajasthan, India', '2500.00', '2025-12-31 18:30:00', '2026-12-31 18:30:00', 'SUBMITTED', '2026-10-18 11:18:09', '2026-10-18 11:18:09'),
(12, 13, 2, 'Solar Lifecycle Project 1792322329420', 'Lifecycle solar generation project', 'Rajasthan, India', '2500.00', '2025-12-31 18:30:00', '2026-12-31 18:30:00', 'IN_PROGRESS', '2026-10-18 11:18:49', '2026-10-18 11:18:49'),
(13, 14, 2, 'Solar Lifecycle Project 1792323108147', 'Lifecycle solar generation project', 'Rajasthan, India', '2500.00', '2025-12-31 18:30:00', '2026-12-31 18:30:00', 'CREDITS_ISSUED', '2026-10-18 11:31:48', '2026-10-18 11:31:48'),
(14, 15, 2, 'Solar Lifecycle Project 1792323213499', 'Lifecycle solar generation project', 'Rajasthan, India', '2500.00', '2025-12-31 18:30:00', '2026-12-31 18:30:00', 'COMPLETED', '2026-10-18 11:33:33', '2026-10-18 11:33:33');

-- ------------------------------------------------------------
-- Table: project_documents (7 records)
-- ------------------------------------------------------------
INSERT INTO project_documents (document_id, project_id, document_name, document_type, file_url, uploaded_at) VALUES
(1, 1, 'Solar Farm Verification Report.pdf', 'VERIFICATION_REPORT', 'https://example.com/documents/solar-farm-verification.pdf', '2026-08-20 04:03:32'),
(2, 1, 'Solar Farm Environmental Assessment.pdf', 'ENVIRONMENTAL_REPORT', 'https://example.com/documents/solar-farm-environment.pdf', '2026-08-20 04:03:32'),
(3, 2, 'Rooftop Solar Project Proposal.pdf', 'PROJECT_PROPOSAL', 'https://example.com/documents/rooftop-solar-proposal.pdf', '2026-08-20 04:03:32'),
(4, 3, 'EcoForest Land Assessment.pdf', 'LAND_ASSESSMENT', 'https://example.com/documents/ecoforest-land.pdf', '2026-08-20 04:03:32'),
(5, 3, 'Forest Carbon Assessment.pdf', 'CARBON_ASSESSMENT', 'https://example.com/documents/ecoforest-carbon.pdf', '2026-08-20 04:03:32'),
(6, 4, 'Wind Energy Environmental Report.pdf', 'ENVIRONMENTAL_REPORT', 'https://example.com/documents/wind-energy-environment.pdf', '2026-08-20 04:03:32'),
(7, 5, 'Waste Management Project Proposal.pdf', 'PROJECT_PROPOSAL', 'https://example.com/documents/waste-project-proposal.pdf', '2026-08-20 04:03:32');

-- ------------------------------------------------------------
-- Table: project_verifications (18 records)
-- ------------------------------------------------------------
INSERT INTO project_verifications (verification_id, project_id, verifier_id, verification_stage, verified_co2_reduction, credits_used, status, remarks, verified_at) VALUES
(1, 1, 9, 'START_APPROVAL', '5000.00', NULL, 'APPROVED', 'Project documents verified and start approval granted.', '2026-08-20 04:03:32'),
(2, 2, 9, 'START_APPROVAL', '2600.00', NULL, 'APPROVED', 'Project approved after reviewing energy generation estimates.', '2026-08-20 04:03:32'),
(3, 3, 9, 'START_APPROVAL', '3900.00', NULL, 'APPROVED', 'Forest restoration methodology and carbon estimation verified.', '2026-08-20 04:03:32'),
(4, 4, 9, 'START_APPROVAL', '6400.00', NULL, 'APPROVED', 'Wind energy project approved after verification.', '2026-08-20 04:03:32'),
(5, 1, 9, 'COMPLETION_REVIEW', NULL, 1200, 'APPROVED', 'Project completed. Company reported 1200 credits used.', '2026-08-20 04:03:32'),
(6, 3, 9, 'COMPLETION_REVIEW', NULL, 1000, 'APPROVED', 'Project completed. Company reported 1000 credits used.', '2026-08-20 04:03:32'),
(7, 4, 9, 'COMPLETION_REVIEW', NULL, 2000, 'APPROVED', 'Project completed. Company reported 2000 credits used.', '2026-08-20 04:03:32'),
(8, 5, 9, 'START_APPROVAL', '1900.00', NULL, 'APPROVED', 'kub', '2026-08-20 08:12:16'),
(9, 7, 9, 'START_APPROVAL', '2800.00', NULL, 'APPROVED', 'jyv', '2026-08-20 08:12:26'),
(10, 6, 9, 'START_APPROVAL', '1400.00', NULL, 'APPROVED', 'Project 6 approved after verification testing', '2026-09-29 06:11:43'),
(11, 6, 9, 'COMPLETION_REVIEW', NULL, 100, 'APPROVED', 'Project completion verified successfully', '2026-09-29 06:12:02'),
(12, 9, 9, 'START_APPROVAL', '1000.00', NULL, 'APPROVED', 'okay you can start your project', '2026-10-03 17:15:18'),
(13, 9, 9, 'COMPLETION_REVIEW', NULL, 950, 'APPROVED', 'Project information and estimated carbon reduction verified.', '2026-10-03 17:16:32'),
(14, 10, 9, 'START_APPROVAL', '3000.00', NULL, 'APPROVED', 'You can start the process', '2026-10-04 11:32:09'),
(15, 12, 9, 'START_APPROVAL', '2400.00', NULL, 'APPROVED', 'Verified solar site and baseline measurements', '2026-10-18 11:18:49'),
(16, 13, 9, 'START_APPROVAL', '2400.00', NULL, 'APPROVED', 'Verified solar site and baseline measurements', '2026-10-18 11:31:48'),
(17, 14, 9, 'START_APPROVAL', '2400.00', NULL, 'APPROVED', 'Verified solar site and baseline measurements', '2026-10-18 11:33:33'),
(18, 14, 9, 'COMPLETION_REVIEW', NULL, 300, 'APPROVED', 'Project completed operational cycle; 300 credits consumed internally', '2026-10-18 11:33:33');

-- ------------------------------------------------------------
-- Table: verification_notifications (27 records)
-- ------------------------------------------------------------
INSERT INTO verification_notifications (notification_id, project_id, verifier_id, notification_type, notification_status, created_at, completed_at) VALUES
(1, 1, 9, 'START_APPROVAL', 'COMPLETED', '2026-01-01 03:30:00', '2026-01-02 04:30:00'),
(2, 1, 9, 'COMPLETION_REVIEW', 'COMPLETED', '2026-12-31 03:30:00', '2027-01-02 04:30:00'),
(3, 2, 9, 'START_APPROVAL', 'COMPLETED', '2026-02-01 03:30:00', '2026-02-02 04:30:00'),
(4, 2, 9, 'COMPLETION_REVIEW', 'PENDING', '2026-12-31 03:30:00', NULL),
(5, 3, 9, 'START_APPROVAL', 'COMPLETED', '2026-01-15 03:30:00', '2026-01-16 04:30:00'),
(6, 3, 9, 'COMPLETION_REVIEW', 'COMPLETED', '2030-12-31 03:30:00', '2031-01-02 04:30:00'),
(7, 4, 9, 'START_APPROVAL', 'COMPLETED', '2026-03-01 03:30:00', '2026-03-02 04:30:00'),
(8, 4, 9, 'COMPLETION_REVIEW', 'COMPLETED', '2026-12-31 03:30:00', '2027-01-02 04:30:00'),
(9, 5, 9, 'START_APPROVAL', 'COMPLETED', '2026-04-01 03:30:00', '2026-08-20 08:12:16'),
(10, 5, 9, 'COMPLETION_REVIEW', 'PENDING', '2026-12-31 03:30:00', NULL),
(11, 6, 9, 'START_APPROVAL', 'COMPLETED', '2026-08-20 04:04:58', '2026-09-29 06:11:43'),
(12, 7, 9, 'START_APPROVAL', 'COMPLETED', '2026-08-20 04:16:55', '2026-08-20 08:12:26'),
(13, 8, 9, 'START_APPROVAL', 'PENDING', '2026-08-20 06:19:50', NULL),
(14, 5, 9, 'COMPLETION_REVIEW', 'PENDING', '2026-08-20 08:12:16', NULL),
(15, 7, 9, 'COMPLETION_REVIEW', 'PENDING', '2026-08-20 08:12:26', NULL),
(16, 6, 9, 'COMPLETION_REVIEW', 'COMPLETED', '2026-09-29 06:11:43', '2026-09-29 06:12:02'),
(17, 9, 9, 'START_APPROVAL', 'COMPLETED', '2026-10-03 17:13:26', '2026-10-03 17:15:18'),
(18, 9, 9, 'COMPLETION_REVIEW', 'COMPLETED', '2026-10-03 17:15:18', '2026-10-03 17:16:32'),
(19, 10, 9, 'START_APPROVAL', 'COMPLETED', '2026-10-04 11:29:27', '2026-10-04 11:32:09'),
(20, 10, 9, 'COMPLETION_REVIEW', 'PENDING', '2026-10-04 11:32:09', NULL),
(21, 11, 9, 'START_APPROVAL', 'PENDING', '2026-10-18 11:18:09', NULL),
(22, 12, 9, 'START_APPROVAL', 'COMPLETED', '2026-10-18 11:18:49', '2026-10-18 11:18:49'),
(23, 12, 9, 'COMPLETION_REVIEW', 'PENDING', '2026-10-18 11:18:49', NULL),
(24, 13, 9, 'START_APPROVAL', 'COMPLETED', '2026-10-18 11:31:48', '2026-10-18 11:31:48'),
(25, 13, 9, 'COMPLETION_REVIEW', 'PENDING', '2026-10-18 11:31:48', NULL),
(26, 14, 9, 'START_APPROVAL', 'COMPLETED', '2026-10-18 11:33:33', '2026-10-18 11:33:33'),
(27, 14, 9, 'COMPLETION_REVIEW', 'COMPLETED', '2026-10-18 11:33:33', '2026-10-18 11:33:33');

-- ------------------------------------------------------------
-- Table: project_completion_reports (6 records)
-- ------------------------------------------------------------
INSERT INTO project_completion_reports (completion_id, project_id, verifier_id, credits_used, remarks, verified_at) VALUES
(1, 1, 9, 1200, 'Completed project review. 1200 credits reported as used.', '2027-01-02 04:30:00'),
(2, 3, 9, 1000, 'Completed project review. 1000 credits reported as used.', '2031-01-02 04:30:00'),
(3, 4, 9, 2000, 'Completed project review. 2000 credits reported as used.', '2027-01-02 04:30:00'),
(4, 6, 9, 100, 'Project completion verified successfully', '2026-09-29 06:12:02'),
(5, 9, 9, 950, 'Project information and estimated carbon reduction verified.', '2026-10-03 17:16:32'),
(6, 14, 9, 300, 'Project completed operational cycle; 300 credits consumed internally', '2026-10-18 11:33:33');

-- ------------------------------------------------------------
-- Table: carbon_credits (8 records)
-- ------------------------------------------------------------
INSERT INTO carbon_credits (credit_id, verification_id, quantity, vintage_year, issue_date, status, created_at) VALUES
(1, 1, 5000, 2026, '2026-05-31 18:30:00', 'TOKENIZED', '2026-08-20 04:03:32'),
(2, 3, 3900, 2026, '2026-06-09 18:30:00', 'TOKENIZED', '2026-08-20 04:03:32'),
(3, 4, 6400, 2026, '2026-06-19 18:30:00', 'TOKENIZED', '2026-08-20 04:03:32'),
(4, 10, 1400, 2026, '2026-09-28 18:30:00', 'TOKENIZED', '2026-09-29 06:28:21'),
(5, 12, 950, 2026, '2026-10-02 18:30:00', 'ISSUED', '2026-10-03 18:13:04'),
(6, 14, 2550, 2026, '2026-10-03 18:30:00', 'TOKENIZED', '2026-10-04 11:33:13'),
(7, 16, 2400, 2026, '2026-10-17 18:30:00', 'TOKENIZED', '2026-10-18 11:31:48'),
(8, 17, 2400, 2026, '2026-10-17 18:30:00', 'TOKENIZED', '2026-10-18 11:33:33');

-- ------------------------------------------------------------
-- Table: company_credit_holdings (12 records)
-- ------------------------------------------------------------
INSERT INTO company_credit_holdings (holding_id, company_id, credit_id, quantity_owned, updated_at) VALUES
(1, 2, 1, 4610, '2026-10-18 11:10:21'),
(2, 3, 2, 3800, '2026-08-20 04:03:32'),
(3, 4, 3, 6100, '2026-08-20 04:03:32'),
(4, 2, 4, 1300, '2026-10-03 05:10:12'),
(5, 6, 4, 50, '2026-10-03 05:27:31'),
(6, 2, 5, 950, '2026-10-03 18:13:04'),
(7, 10, 6, 1550, '2026-10-06 12:43:30'),
(8, 3, 1, 40, '2026-10-18 11:10:21'),
(9, 5, 1, 150, '2026-07-01 05:00:00'),
(10, 6, 1, 75, '2026-07-05 08:50:00'),
(11, 5, 2, 75, '2026-07-10 04:15:00'),
(12, 7, 3, 300, '2026-07-15 10:40:00'),
(14, 14, 7, 2100, '2026-10-18 11:31:48'),
(15, 3, 7, 200, '2026-10-18 11:31:48'),
(16, 15, 8, 2100, '2026-10-18 11:33:33'),
(17, 3, 8, 200, '2026-10-18 11:33:33');

-- ------------------------------------------------------------
-- Table: blockchain_tokens (7 records)
-- ------------------------------------------------------------
INSERT INTO blockchain_tokens (blockchain_token_id, credit_id, on_chain_token_id, contract_address, blockchain_network, mint_transaction_hash, initial_owner_wallet, minted_quantity, minted_at, status) VALUES
(1, 1, 1001, '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'Polygon Amoy', '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '0x2222222222222222222222222222222222222222', 5000, '2026-08-20 04:03:32', 'ACTIVE'),
(2, 2, 1002, '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'Polygon Amoy', '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', '0x3333333333333333333333333333333333333333', 3900, '2026-08-20 04:03:32', 'ACTIVE'),
(3, 3, 1003, '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'Polygon Amoy', '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc', '0x4444444444444444444444444444444444444444', 6400, '2026-08-20 04:03:32', 'ACTIVE'),
(4, 4, 1004, '0x5555555555555555555555555555555555555555', 'Polygon Amoy', '0x1111111111111111111111111111111111111111111111111111111111111111', '0x6666666666666666666666666666666666666666', 1400, '2026-10-03 04:35:52', 'ACTIVE'),
(5, 6, 6, '0x0000000000000000000000000000000000000000', 'Polygon Testnet', '0xMINT-1791288128444', '0x0000000000000000000000000000000000000000', 2550, '2026-10-06 12:02:11', 'ACTIVE'),
(6, 7, 1792323108260, '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', 'Polygon PoS', '0xmintmintmintmintmintmintmintmintmintmintmintmintmintmintmintmint', '0xf2681329947ae99a9137421cd3f4352a2f482691', 2400, '2026-10-18 11:31:48', 'ACTIVE'),
(7, 8, 1792323213532, '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', 'Polygon PoS', '0xmintmintmintmintmintmintmintmintmintmintmintmintmintmintmintmint', '0x822d4812457121dd9bd6ae92b529abb92d022d66', 2400, '2026-10-18 11:33:33', 'ACTIVE');

-- ------------------------------------------------------------
-- Table: token_transfers (21 records)
-- ------------------------------------------------------------
INSERT INTO token_transfers (transfer_id, blockchain_token_id, from_wallet, to_wallet, quantity, transaction_hash, block_number, transfer_type, transferred_at) VALUES
(1, 1, '0x0000000000000000000000000000000000000000', '0x2222222222222222222222222222222222222222', 5000, '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 100001, 'MINT', '2026-06-01 04:30:00'),
(2, 2, '0x0000000000000000000000000000000000000000', '0x3333333333333333333333333333333333333333', 3900, '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 100002, 'MINT', '2026-06-10 05:30:00'),
(3, 3, '0x0000000000000000000000000000000000000000', '0x4444444444444444444444444444444444444444', 6400, '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc', 100003, 'MINT', '2026-06-20 06:30:00'),
(4, 1, '0x2222222222222222222222222222222222222222', '0x5555555555555555555555555555555555555555', 200, '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', 100101, 'TRANSFER', '2026-07-01 05:00:00'),
(5, 1, '0x2222222222222222222222222222222222222222', '0x6666666666666666666666666666666666666666', 150, '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 100102, 'TRANSFER', '2026-07-05 08:50:00'),
(6, 2, '0x3333333333333333333333333333333333333333', '0x5555555555555555555555555555555555555555', 100, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', 100103, 'TRANSFER', '2026-07-10 04:15:00'),
(7, 3, '0x4444444444444444444444444444444444444444', '0x7777777777777777777777777777777777777777', 300, '0x1212121212121212121212121212121212121212121212121212121212121212', 100104, 'TRANSFER', '2026-07-15 10:40:00'),
(8, 4, '0x2222222222222222222222222222222222222222', '0x6666666666666666666666666666666666666666', 100, '0x2222222222222222222222222222222222222222222222222222222222222222', NULL, 'TRANSFER', '2026-10-03 05:10:12'),
(9, 4, '0x6666666666666666666666666666666666666666', '0x6666666666666666666666666666666666666666', 50, '0x3333333333333333333333333333333333333333333333333333333333333333', NULL, 'TRANSFER', '2026-10-03 05:27:31'),
(10, 5, '0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000', 2550, '0xMINT-1791288128444', NULL, 'MINT', '2026-10-06 12:02:11'),
(11, 1, '0x2222222222222222222222222222222222222222', '0x3333333333333333333333333333333333333333', 5, '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', NULL, 'TRANSFER', '2026-10-18 11:07:37'),
(12, 1, '0x2222222222222222222222222222222222222222', '0x3333333333333333333333333333333333333333', 10, '0xa1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890', 18177956, 'TRANSFER', '2026-10-18 11:10:20'),
(13, 1, '0x2222222222222222222222222222222222222222', '0x3333333333333333333333333333333333333333', 10, '0x4b2bb8820d3571d51f55302dc30659b3dfea9f6f7794a2050f812041a89a8dbc', 18108821, 'TRANSFER', '2026-10-18 11:10:20'),
(14, 1, '0x2222222222222222222222222222222222222222', '0x3333333333333333333333333333333333333333', 5, '0x791b768638fabe328e96187678ca47ef1a11e103fcd4b1ea7efb7ef595f1a54f', 18010240, 'TRANSFER', '2026-10-18 11:10:20'),
(15, 1, '0x2222222222222222222222222222222222222222', '0x3333333333333333333333333333333333333333', 5, '0xb1954c642a506e2b4a2945044ebce352a04563804dd1a6330c13ac68e1852045', 18308113, 'TRANSFER', '2026-10-18 11:10:21'),
(16, 6, '0xf2681329947ae99a9137421cd3f4352a2f482691', '0xf2681329947ae99a9137421cd3f4352a2f482691', 2400, '0xmintmintmintmintmintmintmintmintmintmintmintmintmintmintmintmint', 18500000, 'MINT', '2026-10-18 11:31:48'),
(17, 6, '0xf2681329947ae99a9137421cd3f4352a2f482691', '0x3333333333333333333333333333333333333333', 200, '0x162bace191e665e68f0412dbcf30750392c3b5f67b4308380e8916c07cf29247', 18479790, 'TRANSFER', '2026-10-18 11:31:48'),
(18, 6, '0xf2681329947ae99a9137421cd3f4352a2f482691', '0x0000000000000000000000000000000000000000', 100, '0x1e8fb9b2677aac001c714f06ec66f446bd2115b0c5b6f236570955f03b59d4e3', 18266615, 'TRANSFER', '2026-10-18 11:31:48'),
(19, 7, '0x822d4812457121dd9bd6ae92b529abb92d022d66', '0x822d4812457121dd9bd6ae92b529abb92d022d66', 2400, '0xmintmintmintmintmintmintmintmintmintmintmintmintmintmintmintmint', 18500000, 'MINT', '2026-10-18 11:33:33'),
(20, 7, '0x822d4812457121dd9bd6ae92b529abb92d022d66', '0x3333333333333333333333333333333333333333', 200, '0x8f8809875c21b95c4889cb1a87b01e95ad6ca1f83b3982607bfc84ab13b541ac', 18194586, 'TRANSFER', '2026-10-18 11:33:33'),
(21, 7, '0x822d4812457121dd9bd6ae92b529abb92d022d66', '0x0000000000000000000000000000000000000000', 100, '0xb903a4e7c16c8eda9d28b16b959234fd4426b2b70ed98b1b776855392ec5ac06', 18429502, 'TRANSFER', '2026-10-18 11:33:33');

-- ------------------------------------------------------------
-- Table: credit_usage_reports (6 records)
-- ------------------------------------------------------------
INSERT INTO credit_usage_reports (usage_report_id, completion_id, credits_used, reported_at) VALUES
(1, 1, 1200, '2027-01-02 04:30:00'),
(2, 2, 1000, '2031-01-02 04:30:00'),
(3, 3, 2000, '2027-01-02 04:30:00'),
(4, 4, 100, '2026-09-29 06:12:02'),
(5, 5, 950, '2026-10-03 17:16:32'),
(6, 6, 300, '2026-10-18 11:33:33');

-- ------------------------------------------------------------
-- Table: credit_price_approvals (7 records)
-- ------------------------------------------------------------
INSERT INTO credit_price_approvals (price_approval_id, project_id, verifier_id, price_per_credit, status, approved_at) VALUES
(1, 1, 9, '720.00', 'ACTIVE', '2026-06-25 04:30:00'),
(2, 3, 9, '690.00', 'ACTIVE', '2026-06-26 04:30:00'),
(3, 4, 9, '750.00', 'ACTIVE', '2026-06-27 04:30:00'),
(4, 6, 9, '680.00', 'ACTIVE', '2026-10-03 04:44:21'),
(5, 10, 9, '730.00', 'ACTIVE', '2026-10-06 12:24:33'),
(6, 13, 9, '750.00', 'ACTIVE', '2026-10-18 11:31:48'),
(7, 14, 9, '750.00', 'ACTIVE', '2026-10-18 11:33:33');

-- ------------------------------------------------------------
-- Table: price_change_requests (1 records)
-- ------------------------------------------------------------
INSERT INTO price_change_requests (request_id, project_id, requested_price, description, verifier_id, status, requested_at, reviewed_at) VALUES
(1, 3, '760.00', 'Requesting a higher price due to improved market demand and strong environmental performance.', 9, 'PENDING', '2026-07-25 04:30:00', NULL);

-- ------------------------------------------------------------
-- Table: marketplace_listings (7 records)
-- ------------------------------------------------------------
INSERT INTO marketplace_listings (listing_id, seller_company_id, blockchain_token_id, quantity_listed, quantity_available, price_approval_id, status, listed_at, expires_at) VALUES
(1, 2, 1, 1000, 610, 1, 'PARTIALLY_SOLD', '2026-08-20 04:03:32', '2026-12-30 18:30:00'),
(2, 3, 2, 800, 700, 2, 'PARTIALLY_SOLD', '2026-08-20 04:03:32', '2026-12-30 18:30:00'),
(3, 4, 3, 1200, 900, 3, 'PARTIALLY_SOLD', '2026-08-20 04:03:32', '2026-12-30 18:30:00'),
(4, 2, 4, 500, 400, 4, 'PARTIALLY_SOLD', '2026-10-03 05:04:11', '2026-12-30 18:30:00'),
(5, 10, 5, 500, 500, 5, 'ACTIVE', '2026-10-06 12:42:27', NULL),
(6, 14, 6, 1000, 800, 6, 'PARTIALLY_SOLD', '2026-10-18 11:31:48', '2026-12-30 18:30:00'),
(7, 15, 7, 1000, 800, 7, 'PARTIALLY_SOLD', '2026-10-18 11:33:33', '2026-12-30 18:30:00');

-- ------------------------------------------------------------
-- Table: transactions (14 records)
-- ------------------------------------------------------------
INSERT INTO transactions (transaction_id, listing_id, buyer_company_id, quantity, price_per_credit, total_amount, blockchain_tx_hash, transaction_status, transaction_date) VALUES
(1, 1, 5, 200, '720.00', '144000.00', '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', 'SUCCESSFUL', '2026-07-01 05:00:00'),
(2, 1, 6, 150, '720.00', '108000.00', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 'SUCCESSFUL', '2026-07-05 08:50:00'),
(3, 2, 5, 100, '690.00', '69000.00', '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', 'SUCCESSFUL', '2026-07-10 04:15:00'),
(4, 3, 7, 300, '750.00', '225000.00', '0x1212121212121212121212121212121212121212121212121212121212121212', 'SUCCESSFUL', '2026-07-15 10:40:00'),
(5, 3, 6, 100, '750.00', '75000.00', NULL, 'PENDING', '2026-07-20 05:30:00'),
(6, 4, 6, 100, '680.00', '68000.00', '0x2222222222222222222222222222222222222222222222222222222222222222', 'SUCCESSFUL', '2026-10-03 05:10:12'),
(7, 1, 3, 5, '720.00', '3600.00', '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', 'SUCCESSFUL', '2026-10-18 11:07:37'),
(8, 1, 3, 5, '720.00', '3600.00', NULL, 'SUCCESSFUL', '2026-10-18 11:07:37'),
(9, 1, 3, 10, '720.00', '7200.00', '0xa1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890', 'SUCCESSFUL', '2026-10-18 11:10:20'),
(10, 1, 3, 10, '720.00', '7200.00', '0x4b2bb8820d3571d51f55302dc30659b3dfea9f6f7794a2050f812041a89a8dbc', 'SUCCESSFUL', '2026-10-18 11:10:20'),
(11, 1, 3, 5, '720.00', '3600.00', '0x791b768638fabe328e96187678ca47ef1a11e103fcd4b1ea7efb7ef595f1a54f', 'SUCCESSFUL', '2026-10-18 11:10:20'),
(12, 1, 3, 5, '720.00', '3600.00', '0xb1954c642a506e2b4a2945044ebce352a04563804dd1a6330c13ac68e1852045', 'SUCCESSFUL', '2026-10-18 11:10:21'),
(13, 6, 3, 200, '750.00', '150000.00', '0x162bace191e665e68f0412dbcf30750392c3b5f67b4308380e8916c07cf29247', 'SUCCESSFUL', '2026-10-18 11:31:48'),
(14, 7, 3, 200, '750.00', '150000.00', '0x8f8809875c21b95c4889cb1a87b01e95ad6ca1f83b3982607bfc84ab13b541ac', 'SUCCESSFUL', '2026-10-18 11:33:33');

-- ------------------------------------------------------------
-- Table: credit_retirements (7 records)
-- ------------------------------------------------------------
INSERT INTO credit_retirements (retirement_id, company_id, blockchain_token_id, quantity, reason, beneficiary, blockchain_tx_hash, retired_at) VALUES
(1, 5, 1, 50, 'Corporate carbon offset', 'Meera Industries Ltd', '0x3434343434343434343434343434343434343434343434343434343434343434', '2026-07-18 06:30:00'),
(2, 6, 1, 75, 'Annual emissions compensation', 'Global Manufacturing Ltd', '0x4545454545454545454545454545454545454545454545454545454545454545', '2026-07-22 10:00:00'),
(3, 5, 2, 25, 'Operational emission offset', 'Meera Industries Ltd', '0x5656565656565656565656565656565656565656565656565656565656565656', '2026-07-25 04:45:00'),
(4, 6, 4, 50, 'Carbon credits retired for environmental offset', 'Global Manufacturing Ltd', '0x3333333333333333333333333333333333333333333333333333333333333333', '2026-10-03 05:27:31'),
(5, 10, 5, 1000, 'For a backup', 'Charan', NULL, '2026-10-06 12:43:30'),
(6, 14, 6, 100, 'Corporate Sustainability Offsetting', 'Global Green Foundation', '0x1e8fb9b2677aac001c714f06ec66f446bd2115b0c5b6f236570955f03b59d4e3', '2026-10-18 11:31:48'),
(7, 15, 7, 100, 'Corporate Sustainability Offsetting', 'Global Green Foundation', '0xb903a4e7c16c8eda9d28b16b959234fd4426b2b70ed98b1b776855392ec5ac06', '2026-10-18 11:33:33');

-- ------------------------------------------------------------
-- Table: market_data (8 records)
-- ------------------------------------------------------------
INSERT INTO market_data (market_data_id, recorded_at, average_price, demand, supply, trading_volume) VALUES
(1, '2025-12-31 18:30:00', '620.00', 850, 1400, 450),
(2, '2026-01-31 18:30:00', '635.00', 920, 1350, 520),
(3, '2026-02-28 18:30:00', '650.00', 1000, 1320, 600),
(4, '2026-03-31 18:30:00', '665.00', 1080, 1280, 680),
(5, '2026-04-30 18:30:00', '680.00', 1150, 1200, 760),
(6, '2026-05-31 18:30:00', '695.00', 1250, 1150, 850),
(7, '2026-06-30 18:30:00', '715.00', 1380, 1100, 980),
(8, '2026-07-31 18:30:00', '730.00', 1450, 1050, 1100);

-- ------------------------------------------------------------
-- Table: price_predictions (14 records)
-- ------------------------------------------------------------
INSERT INTO price_predictions (prediction_id, generated_at, target_date, current_price, predicted_price, model_name, model_version, confidence_score) VALUES
(1, '2026-07-01 03:30:00', '2026-07-07 18:30:00', '715.00', '724.00', 'Random Forest', '1.0', '82.50'),
(2, '2026-07-08 03:30:00', '2026-07-14 18:30:00', '724.00', '738.00', 'Random Forest', '1.0', '84.20'),
(3, '2026-07-15 03:30:00', '2026-07-21 18:30:00', '738.00', '750.00', 'XGBoost', '1.0', '87.30'),
(4, '2026-07-22 03:30:00', '2026-07-28 18:30:00', '750.00', '762.00', 'XGBoost', '1.0', '88.10'),
(5, '2026-07-29 03:30:00', '2026-08-04 18:30:00', '762.00', '775.00', 'XGBoost', '1.1', '89.40'),
(6, '2026-10-04 11:34:20', '2026-12-22 18:30:00', '730.00', '784.07', 'Market Trend Regression', '1.0', '92.35'),
(7, '2026-10-06 11:57:12', '2026-11-14 18:30:00', '730.00', '763.41', 'Market Trend Regression', '1.0', '92.35'),
(8, '2026-10-06 12:24:13', '2026-11-04 18:30:00', '730.00', '758.24', 'Market Trend Regression', '1.0', '92.35'),
(9, '2026-10-07 04:23:16', '2026-11-05 18:30:00', '730.00', '758.24', 'Market Trend Regression', '1.0', '92.35'),
(10, '2026-10-07 04:23:23', '2026-12-05 18:30:00', '730.00', '773.74', 'Market Trend Regression', '1.0', '92.35'),
(11, '2026-10-07 04:23:29', '2026-12-05 18:30:00', '730.00', '773.74', 'Market Trend Regression', '1.0', '92.35'),
(12, '2026-10-07 04:23:33', '2026-11-05 18:30:00', '730.00', '758.24', 'Market Trend Regression', '1.0', '92.35'),
(13, '2026-10-07 04:23:37', '2026-11-05 18:30:00', '730.00', '758.24', 'Market Trend Regression', '1.0', '92.35'),
(14, '2026-10-07 04:23:45', '2026-12-05 18:30:00', '730.00', '773.74', 'Market Trend Regression', '1.0', '92.35');

