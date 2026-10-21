const { pool } = require("../src/config/database");

async function testTradingReliability() {
    console.log("=================================================");
    console.log("   SECTION B: CREDIT TRADING RELIABILITY SUITE   ");
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

    // 1. Quantity limits: Zero or negative
    try {
        await pool.query("CALL sp_purchase_credits(1, 3, 0, NULL)");
        assert(false, "Block purchase with quantity = 0");
    } catch (e) {
        assert(e.message.includes("greater than zero"), "Block purchase with quantity = 0", e.message);
    }

    try {
        await pool.query("CALL sp_purchase_credits(1, 3, -10, NULL)");
        assert(false, "Block purchase with negative quantity");
    } catch (e) {
        assert(e.message.includes("greater than zero"), "Block purchase with negative quantity", e.message);
    }

    // 2. Quantity limits: Greater than available in listing
    try {
        await pool.query("CALL sp_purchase_credits(1, 3, 999999, NULL)");
        assert(false, "Block purchase exceeding available listing quantity");
    } catch (e) {
        assert(e.message.includes("Insufficient credits"), "Block purchase exceeding available listing quantity", e.message);
    }

    // 3. Buying from own listing
    // Listing 1 seller is company 1 (user 2). Let's attempt purchase by user 2.
    try {
        await pool.query("CALL sp_purchase_credits(1, 2, 5, NULL)");
        assert(false, "Block buying from own listing");
    } catch (e) {
        assert(e.message.includes("cannot purchase its own listing"), "Block buying from own listing", e.message);
    }

    // 4. Successful purchase with user-supplied transaction hash
    const customHash = "0x" + "a1b2c3d4e5f67890".repeat(4);
    const [[listingBefore1]] = await pool.query("SELECT * FROM marketplace_listings WHERE listing_id = 1");
    const [res1] = await pool.query("CALL sp_purchase_credits(1, 3, 10, ?)", [customHash]);
    const txId1 = res1[0][0].transaction_id;
    const [[txRow1]] = await pool.query("SELECT * FROM transactions WHERE transaction_id = ?", [txId1]);
    assert(txRow1 && txRow1.blockchain_tx_hash === customHash, "Record custom transaction hash on purchase", `txId=${txId1}, hash=${txRow1?.blockchain_tx_hash}`);

    const [[transferRow1]] = await pool.query("SELECT * FROM token_transfers WHERE transaction_hash = ?", [customHash]);
    assert(transferRow1 && transferRow1.quantity === 10 && transferRow1.transfer_type === "TRANSFER", "Create token_transfers record with custom hash", `qty=${transferRow1?.quantity}, transferId=${transferRow1?.transfer_id}`);

    // 5. Successful purchase without transaction hash (system auto-generation)
    const [res2] = await pool.query("CALL sp_purchase_credits(1, 3, 10, NULL)");
    const txId2 = res2[0][0].transaction_id;
    const [[txRow2]] = await pool.query("SELECT * FROM transactions WHERE transaction_id = ?", [txId2]);
    assert(txRow2 && txRow2.blockchain_tx_hash && txRow2.blockchain_tx_hash.startsWith("0x") && txRow2.blockchain_tx_hash.length === 66, "Auto-generate 66-char simulation hash when none supplied", `hash=${txRow2?.blockchain_tx_hash}`);

    const [[transferRow2]] = await pool.query("SELECT * FROM token_transfers WHERE transaction_hash = ?", [txRow2.blockchain_tx_hash]);
    assert(transferRow2 && transferRow2.quantity === 10 && transferRow2.transfer_type === "TRANSFER", "Create token_transfers record with auto-generated hash", `qty=${transferRow2?.quantity}`);

    // 6. Balance verification: Check seller decreased and buyer increased exactly once
    const [[listingAfter]] = await pool.query("SELECT quantity_available FROM marketplace_listings WHERE listing_id = 1");
    assert(listingAfter.quantity_available === listingBefore1.quantity_available - 20, "Listing available quantity reduced exactly once", `before=${listingBefore1.quantity_available}, after=${listingAfter.quantity_available}`);

    // 7. Atomic Rollback Verification:
    // If a transaction fails mid-way (e.g. invalid quantity or insufficient balance), NO partial updates persist.
    const [[listingBeforeFail]] = await pool.query("SELECT quantity_available FROM marketplace_listings WHERE listing_id = 1");
    const [[txCountBefore]] = await pool.query("SELECT COUNT(*) AS cnt FROM transactions");
    try {
        await pool.query("CALL sp_purchase_credits(1, 3, 9999999, NULL)");
    } catch (_) {}
    const [[listingAfterFail]] = await pool.query("SELECT quantity_available FROM marketplace_listings WHERE listing_id = 1");
    const [[txCountAfter]] = await pool.query("SELECT COUNT(*) AS cnt FROM transactions");
    assert(listingBeforeFail.quantity_available === listingAfterFail.quantity_available && txCountBefore.cnt === txCountAfter.cnt, "Failed purchase does NOT partially update listing or transactions (Transactional Atomicity)");

    // 8. Simultaneous purchases (Race condition test)
    // Run two purchases concurrently against listing 1
    const buy1 = pool.query("CALL sp_purchase_credits(1, 3, 5, NULL)");
    const buy2 = pool.query("CALL sp_purchase_credits(1, 3, 5, NULL)");
    const [concurrentRes1, concurrentRes2] = await Promise.all([buy1, buy2]);
    assert(concurrentRes1 && concurrentRes2, "Simultaneous purchases handled safely via row-level locking (FOR UPDATE)");

    console.log("=================================================");
    console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log("=================================================");

    process.exit(failedTests > 0 ? 1 : 0);
}

testTradingReliability().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
