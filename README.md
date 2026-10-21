# CarbonX: Enterprise Carbon Credit Management & Trading Platform
**Database Management Systems (DBMS) Laboratory Project**  
*Academic Year: 2026 | Schema: `carbon_v2` (Normalized 3NF Architecture)*

---

## 1. Executive Summary & Architecture

**CarbonX** is an end-to-end carbon credit lifecycle management, verification, and decentralized marketplace platform. It allows sustainable project developers to register carbon offset initiatives, accredited auditors to conduct rigorous MRV (Monitoring, Reporting, and Verification), issuance authorities to mint tokenized carbon credits, and corporations to purchase, trade, or retire credits to fulfill environmental compliance targets.

```
+---------------------------------------------------------------------------------------+
|                                    PRESENTATION TIER                                  |
|            React 19 + Vite SPA (Tailored Vanilla CSS, Dark Glassmorphic Design)       |
|    Admin Portal  |  Company Workspace  |  Verifier Dashboard  |  Marketplace Explorer |
+-------------------------------------------+-------------------------------------------+
                                            | (HTTP / REST API - JWT Bearer Auth)
+-------------------------------------------v-------------------------------------------+
|                                    APPLICATION TIER                                   |
|                           Node.js (v22) + Express.js API Gateway                      |
|  * Auth & RBAC Middleware       * Report Generation & CSV Streamers                   |
|  * Trading & Listing Controller * Market Prediction (Linear Trend Regression)         |
+-------------------------------------------+-------------------------------------------+
                                            | (mysql2 Connection Pool - ACID Transactions)
+-------------------------------------------v-------------------------------------------+
|                                    DATABASE TIER                                      |
|                             MySQL 8.0 Engine (`carbon_v2`)                            |
|  * 21 Normalized 3NF Tables     * 11 Stored Procedures with Rollback Handlers         |
|  * 5 Autonomous Triggers        * 16 Relational Analytical & Operational Views        |
|  * On-Chain Ledger Simulation   * Deterministic Audit Logging                         |
+---------------------------------------------------------------------------------------+
```

---

## 2. Relational Schema & Normalization Analysis

### 2.1 From Legacy Unnormalized Schema to `carbon_v2` (3NF / BCNF)

In the initial project snapshot (`carbon`), several design anomalies were identified:
1. **First Normal Form (1NF) Violation & Mixed Responsibilities**: The `users` table mingled user credentials, authentication tokens, company business profiles, corporate contact information, and role definitions into a single entity.
2. **Second Normal Form (2NF) Violations**: Partial functional dependencies existed where corporate details were dependent only on user ID rather than composite transaction/project keys.
3. **Third Normal Form (3NF) & Transitive Dependencies**: Role names and project types were hardcoded as plain strings across multiple tables (`users.role`, `carbon_projects.project_type`), causing update anomalies and inconsistent data typing.

In **`carbon_v2`**, full **Third Normal Form (3NF)** is enforced:
- **`roles`**: Lookup table (`role_id`, `role_name`) isolating role definitions (`ADMIN`, `COMPANY`, `VERIFIER`).
- **`companies`**: Independent entity (`company_id`, `user_id`, `company_name`) linked via 1-to-1 foreign key to `users(user_id)`.
- **`project_types`**: Normalized domain lookup (`project_type_id`, `type_name`, `description`).
- **`carbon_projects`**: Normalized against `owner_company_id` and `project_type_id`.
- **`company_credit_holdings`**: Many-to-many junction entity with unique constraint `uq_company_credit (company_id, credit_id)` tracking real-time available quantities.

### 2.2 Table Catalog (21 Base Tables)

| # | Table Name | Description | Key Constraints & Indexes |
|---|---|---|---|
| 1 | `roles` | System authorization roles | PK: `role_id`, UNIQUE: `role_name` |
| 2 | `users` | User accounts, credentials, wallets | PK: `user_id`, UNIQUE: `email`, `wallet_address`, FK: `roles` |
| 3 | `companies` | Corporate profiles of project owners/buyers | PK: `company_id`, UNIQUE: `company_name`, FK: `users` (CASCADE) |
| 4 | `project_types` | Standardized carbon reduction sectors | PK: `project_type_id`, UNIQUE: `type_name` |
| 5 | `carbon_projects` | Carbon offset projects & verification status | PK: `project_id`, FK: `companies`, `project_types`, CHECK: `co2 > 0` |
| 6 | `project_documents` | Supporting verification documents / metadata | PK: `document_id`, FK: `carbon_projects` |
| 7 | `project_verifications`| Audit lifecycle stages (`START_APPROVAL`, `COMPLETION_REVIEW`) | PK: `verification_id`, FK: `carbon_projects`, `users` |
| 8 | `verification_notifications`| Verifier task queue notifications | PK: `notification_id`, FK: `carbon_projects`, `users` |
| 9 | `project_completion_reports`| Audited completion metrics and verified usage | PK: `completion_id`, FK: `carbon_projects`, `users` |
| 10| `carbon_credits` | Minted batches of verified carbon credits | PK: `credit_id`, FK: `project_verifications`, CHECK: `quantity > 0` |
| 11| `company_credit_holdings`| Exact per-company credit balances | PK: `holding_id`, UNIQUE: `(company_id, credit_id)`, CHECK: `quantity >= 0` |
| 12| `blockchain_tokens` | On-chain token representation & contract links | PK: `blockchain_token_id`, UNIQUE: `credit_id`, `on_chain_token_id` |
| 13| `token_transfers` | Immutable token transfer ledger | PK: `transfer_id`, FK: `blockchain_tokens`, INDEX: `transaction_hash` |
| 14| `credit_price_approvals`| Verifier-approved credit pricing per project | PK: `price_approval_id`, FK: `carbon_projects`, `users` |
| 15| `price_change_requests`| Company price amendment submissions | PK: `request_id`, FK: `carbon_projects`, `users` |
| 16| `marketplace_listings` | Active and sold market listings | PK: `listing_id`, FK: `companies`, `blockchain_tokens`, CHECK: `qty >= 0` |
| 17| `transactions` | Audited financial trades and settlements | PK: `transaction_id`, FK: `companies`, `marketplace_listings` |
| 18| `credit_retirements` | Permanent offset retirements & certificates | PK: `retirement_id`, FK: `companies`, `blockchain_tokens` |
| 19| `credit_usage_reports` | Company internal consumption records | PK: `usage_report_id`, FK: `project_completion_reports` |
| 20| `market_data` | Historical market snapshots for ML pricing | PK: `market_data_id`, INDEX: `recorded_at` |
| 21| `price_predictions` | Linear regression & market pressure forecasts | PK: `prediction_id`, INDEX: `target_date` |

---

## 3. Procedural Logic, ACID Transactions & Triggers

### 3.1 Stored Procedures

All procedural modifications strictly implement database transactions, row-level locking (`FOR UPDATE`), and automatic rollback handlers:

```sql
DECLARE EXIT HANDLER FOR SQLEXCEPTION
BEGIN
    ROLLBACK;
    RESIGNAL;
END;
```

1. **`sp_create_project`**: Submits project in `SUBMITTED` status and assigns pending notification to an active verifier.
2. **`sp_verify_project`**: Approves/rejects project start. Transitions status to `IN_PROGRESS` and prepares completion review pipeline.
3. **`sp_issue_credits`**: Verifies completed audit and issues credit batch with specific vintage year, automatically initializing project owner's `company_credit_holdings`.
4. **`sp_create_listing`**: Verifies available unlisted balance using row locks, locks holding quantity, and publishes marketplace listing.
5. **`sp_purchase_credits`**: Atomic trading engine:
   - Validates buyer exists, has wallet address, and is distinct from seller (blocks self-purchases).
   - Validates quantity > 0 and available listing quantity.
   - Automatically generates 66-character simulation hash (`0x` + 64 hex characters via `RANDOM_BYTES(32)`) if none is provided.
   - Inserts audited `token_transfers` record (`transfer_type = 'TRANSFER'`).
   - Atomically deducts seller holdings, increments buyer holdings, and updates listing status (`SOLD` / `PARTIALLY_SOLD`).
6. **`sp_retire_credits`**: Atomically debits company holdings, creates retirement certificate, and transfers tokens to burn address `0x0000000000000000000000000000000000000000`.
7. **`sp_complete_project`**: Records completion audit, logs credits internally consumed, and verifies final environmental impact.
8. **`sp_request_price_change` & `sp_review_price_change`**: Governance workflow for adjusting project credit prices.
9. **`sp_approve_credit_price`**: Baseline price authorization by certified auditor.
10. **`sp_get_company_credit_summary`**: Aggregates holding statistics, deficits, and eligibility metrics for dashboard widgets.

### 3.2 Database Triggers

1. **`trg_listing_status_insert` & `trg_listing_status_update`**: Automatically updates listing state to `SOLD` if `quantity_available = 0`, or `PARTIALLY_SOLD` if `quantity_available < quantity_listed`.
2. **`trg_transaction_total_insert` & `trg_transaction_total_update`**: Enforces strict financial calculations (`total_amount = quantity * price_per_credit`) preventing tampering.
3. **`trg_retirement_validation`**: BEFORE INSERT trigger validating that retirement quantities are strictly positive.

### 3.3 Relational Views (16 Views)

- **`vw_admin_dashboard`**: Platform-wide KPI aggregates.
- **`vw_company_projects`**: Joined project portfolio with sector taxonomy and company ownership.
- **`vw_project_verification`**: Audit log of verification milestones.
- **`vw_carbon_credit_summary`**: Carbon credit batches joined with project and vintage data.
- **`vw_blockchain_tokens`**: Tokenized credits mapped to wallet addresses and networks.
- **`vw_active_marketplace`**: Real-time marketplace board sorted by unit price.
- **`vw_transaction_history`**: Trade ledger with buyer/seller company identities and blockchain transaction hashes.
- **`vw_company_portfolio`**: Real-time holding breakdown per company.
- **`vw_retired_credits`**: Permanent offset registry with retirement reasons and certificates.
- **`vw_market_analysis`**: Supply vs demand deficit metrics and price averages.
- **`vw_price_prediction`**: ML forecast outputs and confidence intervals.
- **`vw_token_transfer_history`**: Audit trail of mint, transfer, and burn events.
- **`vw_company_credit_balance`**: Company compliance tracking computing `credit_difference = registered_credits - reported_credits` and assigning `ELIGIBLE` or `DEFICIT` project creation status.
- **`vw_verifier_pending_work`**: Real-time inbox for verifiers.
- **`vw_completion_reviews`**: Final project review queue.
- **`vw_price_change_requests`**: Price amendment governance log.

---

## 4. Blockchain Ledger Simulation Architecture

To satisfy strict academic demonstration guidelines without requiring live testnet gas fees or external wallet browser extensions:
- The system incorporates an **Audited Relational Ledger Simulation**.
- When credits are tokenized, a record is added to `blockchain_tokens` with contract address `0x742d35Cc6634C0532925a3b844Bc454e4438f44e` and a cryptographically generated 256-bit mint hash.
- Every transaction executes `sp_purchase_credits`, which writes an immutable row into `token_transfers` storing `from_wallet`, `to_wallet`, `quantity`, block number, and transaction hash.
- Credit retirement transfers tokens directly to the zero-address `0x0000000000000000000000000000000000000000`.
- The user interface prominently displays an **"On-Chain Ledger Simulation"** badge explaining this relational ledger model.

---

## 5. Clean Installation & Setup Sequence

### 5.1 Prerequisites
- **MySQL Server 8.0** running on `localhost:3306`
- **Node.js (v18+)**
- Database credentials configured in `backend/.env` (refer to `backend/.env.example`)

### 5.2 Canonical Database Installation Sequence

Execute the following 5 scripts in order:

```bash
# Using MySQL Command Line Client or PowerShell
cd project/database

# 1. Normalized Schema DDL (creates database carbon_v2, tables, constraints, indexes)
mysql -u root -p < 01_normalized_schema.sql

# 2. Stored Procedures & Triggers (ACID transactions, rollback handlers, triggers)
mysql -u root -p < 02_normalized_procedures_triggers.sql

# 3. Normalized Relational Views (16 reporting and operational views)
mysql -u root -p < 03_normalized_views.sql

# 4. Sample Seed Data (Clean initial dataset with balanced credit ledger)
mysql -u root -p < 04_sample_seed_data.sql

# 5. Database Verification Suite (Validates all constraints, views, and procedures)
mysql -u root -p < 05_test_queries.sql
```

### 5.3 Backend Setup

```bash
cd project/backend
# Copy sample configuration
cp .env.example .env
# Ensure DB_PASSWORD and DB_NAME=carbon_v2 are set in .env
npm install
npm start
# Server listens on http://localhost:5000
```

### 5.4 Frontend Setup

```bash
cd project/frontend
npm install
npm run dev
# Vite dev server listens on http://127.0.0.1:5173
```

---

## 6. Demonstration Script & Evaluation Run-Sheet

### 6.1 Demonstration Accounts

| Role | Email | Password | Organization | Wallet Address |
|---|---|---|---|---|
| **ADMIN** | `admin@carbon.com` | `Admin@123` | CarbonX System Administration | `0x1111111111111111111111111111111111111111` |
| **VERIFIER** | `verifier@carbon.com` | `Verifier@123` | Carbon Verification Authority | `0x9999999999999999999999999999999999999999` |
| **COMPANY 1** | `arjun@greenpower.com` | `Company@123` | GreenPower Energy Pvt Ltd | `0x2222222222222222222222222222222222222222` |
| **COMPANY 2** | `priya@ecoforest.com` | `Company@123` | EcoForest Solutions | `0x3333333333333333333333333333333333333333` |
| **COMPANY 3** | `rahul@windenergy.com` | `Company@123` | WindEnergy Corporation | `0x4444444444444444444444444444444444444444` |

### 6.2 End-to-End Walkthrough Steps

#### Step 1: Admin Reports & Platform Analytics
1. Navigate to `http://127.0.0.1:5173/login` and log in with `admin@carbon.com` / `Admin@123`.
2. Click **Reports** in the navigation bar (`/admin/reports`).
3. Show the **Summary KPI Cards** (Total Projects, Total Credits Issued, Total Traded, Market Volume).
4. Demonstrate the **Company Performance Table** showcasing per-company compliance and trade volumes.
5. Click each of the 5 **CSV Export** buttons (`Projects`, `Credits`, `Transactions`, `Blockchain`, `Retirements`) to demonstrate live data streaming from MySQL.

#### Step 2: Company Project Submission
1. Log out and sign in as `arjun@greenpower.com` / `Company@123`.
2. Navigate to **Projects** -> Click **+ Submit New Project**.
3. Enter Project Name (`Solar Rooftop Microgrid`), Sector (`Renewable Energy`), Location (`Karnataka, India`), Estimated CO2 (`2000`), and dates.
4. Submit project. Confirm status is immediately set to `SUBMITTED`.

#### Step 3: Verifier MRV & Credit Issuance
1. Log out and sign in as `verifier@carbon.com` / `Verifier@123`.
2. Navigate to **Verifications**. The newly submitted project appears in the pending queue.
3. Click **Review** -> Set status to `APPROVED` with verified reduction `2000` tonnes.
4. Confirm project status updates to `IN_PROGRESS`.
5. Issue credits for vintage year 2026. The system mints 2000 credits and automatically creates holdings for GreenPower Energy.

#### Step 4: Marketplace Listing & Trading
1. Log in back as `arjun@greenpower.com` (Seller).
2. Go to **Marketplace** -> Click **Create Listing**. List 500 credits at $720/credit.
3. Log out and sign in as `priya@ecoforest.com` (Buyer).
4. Browse the Marketplace (`/marketplace`), select GreenPower's listing, and click **Buy Credits**.
5. Purchase 100 credits.
6. The system executes `sp_purchase_credits` within an atomic transaction:
   - Deducts 100 from GreenPower's listing and holding.
   - Credits 100 to EcoForest's holding.
   - Generates simulated Ethereum transaction hash.
   - Appends audit entry into `token_transfers`.

#### Step 5: Credit Retirement & Burn
1. As `priya@ecoforest.com`, navigate to **Portfolio / Holdings**.
2. Select 50 credits and click **Retire Credits**.
3. Enter beneficiary (`EcoForest Corporate Sustainability`) and reason (`Offsetting annual scope 2 emissions`).
4. Submit retirement. System transfers 50 tokens to `0x0000...0000` and generates an official certificate.

#### Step 6: Blockchain Explorer Audit
1. Navigate to **Blockchain Explorer** (`/blockchain`).
2. Point out the **"On-Chain Ledger Simulation"** badge.
3. Show the real-time block and token transfer table displaying the minting, marketplace purchase, and retirement burn hashes.

---

## 7. Automated Test Suite Results

The platform includes 3 automated integration test suites:

```bash
# 1. Trading Reliability & ACID Atomicity Suite (11/11 Passed)
node backend/scripts/test_trading_reliability.js

# 2. End-to-End Project Lifecycle Suite (21/21 Passed)
node backend/scripts/test_project_lifecycle.js

# 3. Reports & CSV Export Validation Suite (All Passed)
node backend/scripts/test_reports_api.js
```

### Invariant Test Verification Output:
```
+---------------------------------------------------------------------------------------+
|  total_credits_issued  |  total_held  |  total_retired  |  credit_integrity_status    |
|         25,000         |    23,600    |      1,400      |  PASSED: LEDGER BALANCED    |
+---------------------------------------------------------------------------------------+
```

---

## 8. Summary of Completed Enhancements

| Area | Status | Resolution Details |
|---|---|---|
| **A. Failing Reports Page** | **RESOLVED** | Fixed Cartesian join aggregation error; replaced with correlated subqueries; verified all 5 CSV exports. |
| **B. Credit Trading Reliability** | **RESOLVED** | Hardened `sp_purchase_credits` with `FOR UPDATE` locking, auto-generated 66-char tx hash, and atomic balance updates. |
| **C. Project Lifecycle** | **RESOLVED** | Verified full 10-stage lifecycle from registration to usage reporting with 21 automated integration tests. |
| **D. Database Design & Integrity** | **RESOLVED** | Established canonical 5-script installation sequence for `carbon_v2`; created all 16 views and `05_test_queries.sql`. |
| **E. Analytics & Pricing** | **RESOLVED** | Verified linear regression market model on real `market_data`; verified price review stored procedures. |
| **F. Blockchain Level** | **RESOLVED** | Clarified and badged on-chain ledger simulation across UI and schema; documented cryptographic hash persistence. |
| **G. Final Quality & Build** | **RESOLVED** | `npm run lint`: 0 errors; `npm run build`: built cleanly; created `.env.example` to protect secrets. |
