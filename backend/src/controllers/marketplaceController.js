const { pool } = require("../config/database");

async function getCompanyByUserId(userId) {
    const [rows] = await pool.execute(
        `
        SELECT c.company_id, c.company_name, u.full_name
        FROM companies c
        INNER JOIN users u ON u.user_id = c.user_id
        WHERE c.user_id = ?
        LIMIT 1
        `,
        [userId]
    );
    return rows[0] || null;
}

async function getMarketplaceListings(req, res) {
    try {
        const [listings] = await pool.execute(`
            SELECT
                ml.listing_id,
                sc.company_id AS seller_company_id,
                su.user_id AS seller_id,
                su.full_name AS seller_name,
                sc.company_name AS seller_company,
                ml.blockchain_token_id,
                bt.on_chain_token_id,
                bt.contract_address,
                bt.blockchain_network,
                cc.credit_id,
                pv.project_id,
                cp.project_name,
                pt.type_name AS project_type,
                cp.location,
                cp.estimated_co2_reduction,
                cc.quantity AS total_credit_quantity,
                cc.vintage_year,
                cc.issue_date,
                ml.quantity_listed,
                ml.quantity_available,
                cpa.price_per_credit,
                ml.price_approval_id,
                ml.status,
                ml.listed_at,
                ml.expires_at
            FROM marketplace_listings ml
            INNER JOIN companies sc
                ON sc.company_id = ml.seller_company_id
            INNER JOIN users su
                ON su.user_id = sc.user_id
            INNER JOIN blockchain_tokens bt
                ON bt.blockchain_token_id = ml.blockchain_token_id
            INNER JOIN carbon_credits cc
                ON cc.credit_id = bt.credit_id
            INNER JOIN project_verifications pv
                ON pv.verification_id = cc.verification_id
            INNER JOIN carbon_projects cp
                ON cp.project_id = pv.project_id
            INNER JOIN project_types pt
                ON pt.project_type_id = cp.project_type_id
            INNER JOIN credit_price_approvals cpa
                ON cpa.price_approval_id = ml.price_approval_id
            WHERE ml.status IN ('ACTIVE', 'PARTIALLY_SOLD')
            ORDER BY ml.listing_id DESC
        `);

        return res.json({ success: true, count: listings.length, data: listings });
    } catch (error) {
        console.error("Get marketplace error:", error);
        return res.status(500).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to retrieve marketplace listings"
        });
    }
}

async function getMarketplaceListingById(req, res) {
    try {
        const { id } = req.params;

        const [listings] = await pool.execute(`
            SELECT
                ml.listing_id,
                sc.company_id AS seller_company_id,
                su.user_id AS seller_id,
                su.full_name AS seller_name,
                sc.company_name AS seller_company,
                ml.blockchain_token_id,
                bt.on_chain_token_id,
                bt.contract_address,
                bt.blockchain_network,
                bt.mint_transaction_hash,
                cc.credit_id,
                pv.project_id,
                cp.project_name,
                pt.type_name AS project_type,
                pt.description AS project_type_description,
                cp.description,
                cp.location,
                cp.estimated_co2_reduction,
                cc.quantity AS total_credit_quantity,
                cc.vintage_year,
                cc.issue_date,
                cpa.price_per_credit,
                ml.price_approval_id,
                ml.quantity_listed,
                ml.quantity_available,
                ml.status,
                ml.listed_at,
                ml.expires_at
            FROM marketplace_listings ml
            INNER JOIN companies sc
                ON sc.company_id = ml.seller_company_id
            INNER JOIN users su
                ON su.user_id = sc.user_id
            INNER JOIN blockchain_tokens bt
                ON bt.blockchain_token_id = ml.blockchain_token_id
            INNER JOIN carbon_credits cc
                ON cc.credit_id = bt.credit_id
            INNER JOIN project_verifications pv
                ON pv.verification_id = cc.verification_id
            INNER JOIN carbon_projects cp
                ON cp.project_id = pv.project_id
            INNER JOIN project_types pt
                ON pt.project_type_id = cp.project_type_id
            INNER JOIN credit_price_approvals cpa
                ON cpa.price_approval_id = ml.price_approval_id
            WHERE ml.listing_id = ?
            LIMIT 1
        `, [id]);

        if (listings.length === 0) {
            return res.status(404).json({ success: false, message: "Marketplace listing not found" });
        }

        return res.json({ success: true, data: listings[0] });
    } catch (error) {
        console.error("Get marketplace listing error:", error);
        return res.status(500).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to retrieve marketplace listing"
        });
    }
}

async function createListing(req, res) {
    try {
        const { blockchain_token_id, quantity, price_approval_id, expires_at } = req.body;

        if (!blockchain_token_id || quantity === undefined || !price_approval_id) {
            return res.status(400).json({
                success: false,
                message: "Blockchain token ID, quantity and price approval ID are required"
            });
        }

        if (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
            return res.status(400).json({ success: false, message: "Listing quantity must be a positive integer" });
        }

        if (!Number.isInteger(Number(price_approval_id)) || Number(price_approval_id) <= 0) {
            return res.status(400).json({ success: false, message: "Valid price approval ID is required" });
        }

        const [result] = await pool.query(
            `CALL sp_create_listing(?, ?, ?, ?, ?)`,
            [
                req.user.user_id,
                Number(blockchain_token_id),
                Number(quantity),
                Number(price_approval_id),
                expires_at || null
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Carbon credits listed successfully",
            data: {
                listing_id: result?.[0]?.[0]?.listing_id || null,
                seller_id: req.user.user_id,
                blockchain_token_id: Number(blockchain_token_id),
                quantity: Number(quantity),
                price_approval_id: Number(price_approval_id),
                expires_at: expires_at || null
            }
        });
    } catch (error) {
        console.error("Create listing error:", error);
        return res.status(400).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to create marketplace listing"
        });
    }
}

async function purchaseCredits(req, res) {
    try {
        const { listing_id, quantity, blockchain_tx_hash } = req.body;

        if (!listing_id || quantity === undefined) {
            return res.status(400).json({ success: false, message: "Listing ID and quantity are required" });
        }

        if (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
            return res.status(400).json({ success: false, message: "Purchase quantity must be a positive integer" });
        }

        const [result] = await pool.query(
            `CALL sp_purchase_credits(?, ?, ?, ?)`,
            [
                Number(listing_id),
                req.user.user_id,
                Number(quantity),
                blockchain_tx_hash ? String(blockchain_tx_hash).trim() : null
            ]
        );

        const transactionId = result?.[0]?.[0]?.transaction_id || null;
        let txDetails = null;
        if (transactionId) {
            const [[tx]] = await pool.query(
                `SELECT transaction_id, total_amount, price_per_credit, blockchain_tx_hash, transaction_status, transaction_date FROM transactions WHERE transaction_id = ?`,
                [transactionId]
            );
            txDetails = tx;
        }

        return res.status(201).json({
            success: true,
            message: "Carbon credits purchased successfully",
            data: {
                transaction_id: transactionId,
                listing_id: Number(listing_id),
                buyer_id: req.user.user_id,
                quantity: Number(quantity),
                price_per_credit: txDetails?.price_per_credit,
                total_amount: txDetails?.total_amount,
                blockchain_tx_hash: txDetails?.blockchain_tx_hash || blockchain_tx_hash || null,
                transaction_status: txDetails?.transaction_status || "SUCCESSFUL",
                transaction_date: txDetails?.transaction_date
            }
        });
    } catch (error) {
        console.error("Purchase credits error:", error);
        return res.status(400).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to purchase carbon credits"
        });
    }
}

async function getMyListings(req, res) {
    try {
        const company = await getCompanyByUserId(req.user.user_id);
        if (!company) {
            return res.status(404).json({ success: false, message: "Company profile not found" });
        }

        const [listings] = await pool.execute(`
            SELECT
                ml.listing_id,
                ml.seller_company_id,
                su.user_id AS seller_id,
                ml.blockchain_token_id,
                cc.credit_id,
                pv.project_id,
                cp.project_name,
                pt.type_name AS project_type,
                ml.quantity_listed,
                ml.quantity_available,
                cpa.price_per_credit,
                ml.price_approval_id,
                ml.status,
                ml.listed_at,
                ml.expires_at
            FROM marketplace_listings ml
            INNER JOIN companies sc
                ON sc.company_id = ml.seller_company_id
            INNER JOIN users su
                ON su.user_id = sc.user_id
            INNER JOIN blockchain_tokens bt
                ON bt.blockchain_token_id = ml.blockchain_token_id
            INNER JOIN carbon_credits cc
                ON cc.credit_id = bt.credit_id
            INNER JOIN project_verifications pv
                ON pv.verification_id = cc.verification_id
            INNER JOIN carbon_projects cp
                ON cp.project_id = pv.project_id
            INNER JOIN project_types pt
                ON pt.project_type_id = cp.project_type_id
            INNER JOIN credit_price_approvals cpa
                ON cpa.price_approval_id = ml.price_approval_id
            WHERE ml.seller_company_id = ?
            ORDER BY ml.listing_id DESC
        `, [company.company_id]);

        return res.json({ success: true, count: listings.length, data: listings });
    } catch (error) {
        console.error("Get my listings error:", error);
        return res.status(500).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to retrieve your marketplace listings"
        });
    }
}

async function getMySellableCredits(req, res) {
    try {
        const company = await getCompanyByUserId(req.user.user_id);
        if (!company) {
            return res.status(404).json({ success: false, message: "Company profile not found" });
        }

        const [summaryRows] = await pool.query(
            `CALL sp_get_company_credit_summary(?)`,
            [req.user.user_id]
        );
        const summary = summaryRows?.[0]?.[0];
        const surplus = Math.max(Number(summary?.credit_difference || 0), 0);

        const [credits] = await pool.execute(`
            SELECT
                bt.blockchain_token_id,
                bt.on_chain_token_id,
                bt.blockchain_network,
                bt.contract_address,
                cc.credit_id,
                cc.quantity AS issued_quantity,
                cc.vintage_year,
                cc.issue_date,
                cp.project_id,
                cp.project_name,
                pt.type_name AS project_type,
                cp.location,
                h.quantity_owned,
                COALESCE(listed.quantity_listed, 0) AS quantity_already_listed,
                GREATEST(
                    h.quantity_owned - COALESCE(listed.quantity_listed, 0),
                    0
                ) AS token_sellable_quantity,
                cpa.price_approval_id,
                cpa.price_per_credit
            FROM company_credit_holdings h
            INNER JOIN carbon_credits cc
                ON cc.credit_id = h.credit_id
            INNER JOIN blockchain_tokens bt
                ON bt.credit_id = cc.credit_id
               AND bt.status = 'ACTIVE'
            INNER JOIN project_verifications pv
                ON pv.verification_id = cc.verification_id
            INNER JOIN carbon_projects cp
                ON cp.project_id = pv.project_id
            INNER JOIN project_types pt
                ON pt.project_type_id = cp.project_type_id
            INNER JOIN credit_price_approvals cpa
                ON cpa.project_id = cp.project_id
               AND cpa.status = 'ACTIVE'
            LEFT JOIN (
                SELECT
                    seller_company_id,
                    blockchain_token_id,
                    SUM(quantity_available) AS quantity_listed
                FROM marketplace_listings
                WHERE status IN ('ACTIVE', 'PARTIALLY_SOLD')
                GROUP BY seller_company_id, blockchain_token_id
            ) listed
                ON listed.seller_company_id = h.company_id
               AND listed.blockchain_token_id = bt.blockchain_token_id
            WHERE h.company_id = ?
              AND h.quantity_owned > 0
              AND cc.status <> 'RETIRED'
            ORDER BY cp.project_id DESC, bt.blockchain_token_id DESC
        `, [company.company_id]);

        // The company-wide surplus is a single shared limit. Allocate it across
        // token batches once; do not apply the full surplus independently to
        // every row, which could make the displayed total exceed the surplus.
        let remainingSurplus = surplus;
        const data = credits
            .map((credit) => {
                const tokenAvailable = Math.max(
                    Number(credit.token_sellable_quantity || 0),
                    0
                );
                const allocatedSellable = Math.min(tokenAvailable, remainingSurplus);
                remainingSurplus -= allocatedSellable;
                return {
                    ...credit,
                    token_sellable_quantity: allocatedSellable
                };
            })
            .filter((credit) => Number(credit.token_sellable_quantity) > 0);

        return res.json({
            success: true,
            data,
            summary: {
                registered_credits: Number(summary?.registered_credits || 0),
                reported_credits: Number(summary?.reported_credits || 0),
                credit_difference: Number(summary?.credit_difference || 0),
                sellable_credits: surplus
            }
        });
    } catch (error) {
        console.error("Get sellable credits error:", error);
        return res.status(500).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to retrieve sellable credits"
        });
    }
}

async function getMyTransactions(req, res) {
    try {
        const company = await getCompanyByUserId(req.user.user_id);
        if (!company) {
            return res.status(404).json({ success: false, message: "Company profile not found" });
        }

        const [transactions] = await pool.execute(`
            SELECT
                t.transaction_id,
                t.listing_id,
                buyer_user.user_id AS buyer_id,
                buyer_user.full_name AS buyer_name,
                buyer_company.company_name AS buyer_company,
                seller_user.user_id AS seller_id,
                seller_user.full_name AS seller_name,
                seller_company.company_name AS seller_company,
                t.quantity,
                t.price_per_credit,
                t.total_amount,
                t.blockchain_tx_hash,
                t.transaction_status,
                t.transaction_date,
                ml.blockchain_token_id,
                pv.project_id,
                cp.project_name,
                pt.type_name AS project_type
            FROM transactions t
            INNER JOIN marketplace_listings ml
                ON ml.listing_id = t.listing_id
            INNER JOIN companies buyer_company
                ON buyer_company.company_id = t.buyer_company_id
            INNER JOIN users buyer_user
                ON buyer_user.user_id = buyer_company.user_id
            INNER JOIN companies seller_company
                ON seller_company.company_id = ml.seller_company_id
            INNER JOIN users seller_user
                ON seller_user.user_id = seller_company.user_id
            INNER JOIN blockchain_tokens bt
                ON bt.blockchain_token_id = ml.blockchain_token_id
            INNER JOIN carbon_credits cc
                ON cc.credit_id = bt.credit_id
            INNER JOIN project_verifications pv
                ON pv.verification_id = cc.verification_id
            INNER JOIN carbon_projects cp
                ON cp.project_id = pv.project_id
            INNER JOIN project_types pt
                ON pt.project_type_id = cp.project_type_id
            WHERE t.buyer_company_id = ?
               OR ml.seller_company_id = ?
            ORDER BY t.transaction_id DESC
        `, [company.company_id, company.company_id]);

        return res.json({ success: true, count: transactions.length, data: transactions });
    } catch (error) {
        console.error("Get transactions error:", error);
        return res.status(500).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to retrieve transactions"
        });
    }
}

async function getMyCreditSummary(req, res) {
    try {
        const [result] = await pool.query(
            `CALL sp_get_company_credit_summary(?)`,
            [req.user.user_id]
        );

        const summary = result?.[0]?.[0];
        if (!summary) {
            return res.status(404).json({
                success: false,
                message: "Company credit summary not found"
            });
        }

        const registeredCredits = Number(summary.registered_credits || 0);
        const reportedCredits = Number(summary.reported_credits || 0);
        const difference = Number(summary.credit_difference || 0);

        return res.json({
            success: true,
            data: {
                ...summary,
                registered_credits: registeredCredits,
                reported_credits: reportedCredits,
                credit_difference: difference,
                sellable_credits: Math.max(difference, 0),
                credits_to_purchase: Math.max(-difference, 0)
            }
        });
    } catch (error) {
        console.error("Get credit summary error:", error);
        return res.status(500).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to retrieve company credit summary"
        });
    }
}

async function requestPriceChange(req, res) {
    try {
        const { project_id, requested_price, description } = req.body;

        if (!project_id || requested_price === undefined) {
            return res.status(400).json({
                success: false,
                message: "Project ID and requested price are required"
            });
        }

        if (!Number.isFinite(Number(requested_price)) || Number(requested_price) <= 0) {
            return res.status(400).json({ success: false, message: "Requested price must be greater than zero" });
        }

        if (!description?.trim()) {
            return res.status(400).json({ success: false, message: "Price increase description is required" });
        }

        const [result] = await pool.query(
            `CALL sp_request_price_change(?, ?, ?, ?)`,
            [req.user.user_id, Number(project_id), Number(requested_price), description.trim()]
        );

        return res.status(201).json({
            success: true,
            message: "Price increase request submitted successfully",
            data: {
                request_id: result?.[0]?.[0]?.request_id || null,
                project_id: Number(project_id),
                requested_price: Number(requested_price),
                description: description.trim()
            }
        });
    } catch (error) {
        console.error("Request price change error:", error);
        return res.status(400).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to submit price increase request"
        });
    }
}

module.exports = {
    getMarketplaceListings,
    getMarketplaceListingById,
    createListing,
    purchaseCredits,
    getMyListings,
    getMySellableCredits,
    getMyTransactions,
    getMyCreditSummary,
    requestPriceChange
};
