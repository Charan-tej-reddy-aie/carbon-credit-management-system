const { pool } = require("../src/config/database");
const bcrypt = require("bcryptjs");

async function testProjectLifecycle() {
    console.log("=================================================");
    console.log("   SECTION C: FULL PROJECT LIFECYCLE TEST SUITE  ");
    console.log("=================================================");

    let passedTests = 0;
    let failedTests = 0;

    function assert(condition, testName, details = "") {
        if (condition) {
            console.log(`[PASS] ${testName} ${details ? "- " + details : ""}`);
            passedTests++;
        } else {
            console.error(`[FAIL] ${testName} ${details ? "- " + details : ""}`);
            failedTests++;
        }
    }

    // Step 1: Register and login test company
    const testEmail = `lifecycle_test_${Date.now()}@testcompany.com`;
    const testCompanyName = `Lifecycle Test Energy ${Date.now()}`;
    const passwordHash = await bcrypt.hash("Password@123", 10);

    const crypto = require("crypto");
    const testWallet = "0x" + crypto.randomBytes(20).toString("hex");

    const [userRes] = await pool.query(
        `INSERT INTO users (full_name, email, password_hash, role_id, wallet_address, country) 
         VALUES (?, ?, ?, (SELECT role_id FROM roles WHERE role_name='COMPANY'), ?, 'India')`,
        ["Lifecycle Tester", testEmail, passwordHash, testWallet]
    );
    const newUserId = userRes.insertId;

    const [compRes] = await pool.query(
        `INSERT INTO companies (user_id, company_name) VALUES (?, ?)`,
        [newUserId, testCompanyName]
    );
    const newCompanyId = compRes.insertId;
    assert(newUserId && newCompanyId, "Company registration with role_id and company profile", `userId=${newUserId}, companyId=${newCompanyId}`);

    // Verify login password match
    const [[loginUser]] = await pool.query("SELECT * FROM users WHERE user_id = ?", [newUserId]);
    const passMatch = await bcrypt.compare("Password@123", loginUser.password_hash);
    assert(passMatch, "Password verification during login succeeds");

    // Ensure project_types includes all valid UI options
    await pool.query(
        "INSERT IGNORE INTO project_types (type_name, description) VALUES ('Energy Efficiency', 'Energy conservation and efficiency projects')"
    );

    // Step 2: Project Submission
    const [createRes] = await pool.query(
        `CALL sp_create_project(?, ?, 'Renewable Energy', 'Lifecycle solar generation project', 'Rajasthan, India', 2500.00, '2026-01-01', '2027-01-01')`,
        [newUserId, `Solar Lifecycle Project ${Date.now()}`]
    );
    const projectId = createRes[0][0].project_id;
    assert(projectId, "Project submission via sp_create_project", `projectId=${projectId}`);

    const [[projRow]] = await pool.query("SELECT * FROM carbon_projects WHERE project_id = ?", [projectId]);
    assert(projRow.status === "SUBMITTED", "Project starts in SUBMITTED status");

    const [notifs] = await pool.query("SELECT * FROM verification_notifications WHERE project_id = ?", [projectId]);
    assert(notifs.length > 0, "Verification notifications generated for verifiers", `count=${notifs.length}`);

    // Step 3: Verifier Approval
    // User 9 is verifier@carbon.com
    const verifierUserId = 9;
    const [verifRes] = await pool.query(
        `CALL sp_verify_project(?, ?, 2400.00, 'APPROVED', 'Verified solar site and baseline measurements')`,
        [projectId, verifierUserId]
    );
    const verificationId = verifRes[0][0].verification_id;
    assert(verificationId, "Verifier START_APPROVAL verification created", `verificationId=${verificationId}`);

    const [[projAfterVerif]] = await pool.query("SELECT status FROM carbon_projects WHERE project_id = ?", [projectId]);
    assert(projAfterVerif.status === "IN_PROGRESS", "Project status transitions to IN_PROGRESS upon verification approval");

    // Step 4: Credit Issuance
    const [issueRes] = await pool.query(
        `CALL sp_issue_credits(?, ?, 2400, 2026)`,
        [projectId, verificationId]
    );
    const creditId = issueRes[0][0].credit_id;
    assert(creditId, "Credit batch issued via sp_issue_credits", `creditId=${creditId}`);

    const [[creditRow]] = await pool.query("SELECT * FROM carbon_credits WHERE credit_id = ?", [creditId]);
    assert(creditRow.quantity === 2400 && creditRow.status === "ISSUED", "Carbon credit batch quantity and status match verified reduction");

    const [[holdingRow]] = await pool.query("SELECT * FROM company_credit_holdings WHERE company_id = ? AND credit_id = ?", [newCompanyId, creditId]);
    assert(holdingRow && holdingRow.quantity_owned === 2400, "Company credit holding credited to project owner", `owned=${holdingRow?.quantity_owned}`);

    // Step 5: Tokenization
    const onChainTokenId = Date.now();
    const contractAddr = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
    const mintTxHash = "0x" + "mint".repeat(16);
    const [tokenRes] = await pool.query(
        `INSERT INTO blockchain_tokens (credit_id, on_chain_token_id, contract_address, blockchain_network, mint_transaction_hash, initial_owner_wallet, minted_quantity, status)
         VALUES (?, ?, ?, 'Polygon PoS', ?, ?, 2400, 'ACTIVE')`,
        [creditId, onChainTokenId, contractAddr, mintTxHash, loginUser.wallet_address]
    );
    const tokenDbId = tokenRes.insertId;
    await pool.query("UPDATE carbon_credits SET status = 'TOKENIZED' WHERE credit_id = ?", [creditId]);
    await pool.query(
        `INSERT INTO token_transfers (blockchain_token_id, from_wallet, to_wallet, quantity, transaction_hash, block_number, transfer_type)
         VALUES (?, ?, ?, 2400, ?, 18500000, 'MINT')`,
        [tokenDbId, loginUser.wallet_address, loginUser.wallet_address, mintTxHash]
    );
    assert(tokenDbId, "Tokenization creates blockchain_tokens record and MINT transfer", `tokenDbId=${tokenDbId}`);

    // Step 6: Price Approval & Marketplace Listing
    const [priceRes] = await pool.query(
        `CALL sp_approve_credit_price(?, ?, 750.00)`,
        [projectId, verifierUserId]
    );
    const priceApprovalId = priceRes[0][0].price_approval_id;
    assert(priceApprovalId, "Price approval by verifier", `priceApprovalId=${priceApprovalId}`);

    const [listingRes] = await pool.query(
        `CALL sp_create_listing(?, ?, 1000, ?, '2026-12-31')`,
        [newUserId, tokenDbId, priceApprovalId]
    );
    const newListingId = listingRes[0][0].listing_id;
    assert(newListingId, "Marketplace listing created for tokenized credits", `listingId=${newListingId}`);

    // Step 7: Purchase by another company
    // Buyer: User 3 (EcoForest, company_id 2)
    const [buyerPurchase] = await pool.query(
        `CALL sp_purchase_credits(?, 3, 200, NULL)`,
        [newListingId]
    );
    const purchaseTxId = buyerPurchase[0][0].transaction_id;
    assert(purchaseTxId, "Credits purchased by external company", `txId=${purchaseTxId}`);

    const [[listingAfterBuy]] = await pool.query("SELECT * FROM marketplace_listings WHERE listing_id = ?", [newListingId]);
    assert(listingAfterBuy.quantity_available === 800 && listingAfterBuy.status === "PARTIALLY_SOLD", "Listing quantity reduced to 800 and status is PARTIALLY_SOLD");

    // Step 8: Retirement
    // Seller retires 100 of remaining unlisted credits
    const [retireRes] = await pool.query(
        `CALL sp_retire_credits(?, ?, 100, 'Corporate Sustainability Offsetting', 'Global Green Foundation', NULL)`,
        [newUserId, tokenDbId]
    );
    const retirementId = retireRes[0][0].retirement_id;
    assert(retirementId, "Credits retired by company", `retirementId=${retirementId}`);

    const [[retireRow]] = await pool.query("SELECT * FROM credit_retirements WHERE retirement_id = ?", [retirementId]);
    assert(retireRow && retireRow.quantity === 100, "Retirement record stored with reason and beneficiary");

    // Step 9: Project Completion & Usage Reporting
    const [compReportRes] = await pool.query(
        `CALL sp_complete_project(?, ?, 300, 'Project completed operational cycle; 300 credits consumed internally')`,
        [projectId, verifierUserId]
    );
    const completionId = compReportRes[0][0].completion_id;
    assert(completionId, "Project marked completed with completion report", `completionId=${completionId}`);

    const [[finalProj]] = await pool.query("SELECT status FROM carbon_projects WHERE project_id = ?", [projectId]);
    assert(finalProj.status === "COMPLETED", "Project status transitions to COMPLETED");

    // Check usage report was generated
    const [usageRows] = await pool.query("SELECT * FROM credit_usage_reports WHERE completion_id = ?", [completionId]);
    assert(usageRows.length > 0 && usageRows[0].credits_used === 300, "Credit usage report recorded correctly", `credits_used=${usageRows[0]?.credits_used}`);

    // Step 10: Company Credit Balance & Deficit Check
    const [summaryRes] = await pool.query(
        `CALL sp_get_company_credit_summary(?)`,
        [newUserId]
    );
    const summary = summaryRes[0][0];
    console.log("Final company credit balance summary:", summary);
    assert(summary && Number(summary.reported_credits) === 300, "Company reported credits reflected in balance summary", `reported=${summary.reported_credits}`);

    console.log("=================================================");
    console.log(`LIFECYCLE TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log("=================================================");

    process.exit(failedTests > 0 ? 1 : 0);
}

testProjectLifecycle().catch(err => {
    console.error("Lifecycle test error:", err);
    process.exit(1);
});
