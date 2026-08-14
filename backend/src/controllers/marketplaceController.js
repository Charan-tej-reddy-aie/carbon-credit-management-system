const { pool } = require("../config/database");

/*
    GET /api/marketplace

    Returns all active marketplace listings.
*/
async function getMarketplaceListings(req, res) {
    try {
        const [listings] = await pool.execute(`
            SELECT
                ml.listing_id,
                ml.seller_id,
                seller.full_name AS seller_name,
                seller.company_name AS seller_company,

                ml.blockchain_token_id,
                bt.on_chain_token_id,
                bt.blockchain_network,

                cc.credit_id,
                cc.project_id,
                cp.project_name,
                cp.project_type,
                cp.location,
                cc.vintage_year,

                ml.quantity_listed,
                ml.quantity_available,
                ml.price_per_credit,
                ml.status,
                ml.listed_at,
                ml.expires_at

            FROM marketplace_listings ml

            INNER JOIN users seller
                ON ml.seller_id = seller.user_id

            INNER JOIN blockchain_tokens bt
                ON ml.blockchain_token_id = bt.blockchain_token_id

            INNER JOIN carbon_credits cc
                ON bt.credit_id = cc.credit_id

            INNER JOIN carbon_projects cp
                ON cc.project_id = cp.project_id

            WHERE ml.status IN ('ACTIVE', 'PARTIALLY_SOLD')

            ORDER BY ml.listing_id DESC
        `);

        res.json({
            success: true,
            count: listings.length,
            data: listings
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve marketplace listings"
        });
    }
}


/*
    GET /api/marketplace/:id

    Returns one marketplace listing.
*/
async function getMarketplaceListingById(req, res) {
    try {
        const { id } = req.params;

        const [listings] = await pool.execute(`
            SELECT
                ml.listing_id,
                ml.seller_id,
                seller.full_name AS seller_name,
                seller.company_name AS seller_company,

                ml.blockchain_token_id,
                bt.on_chain_token_id,
                bt.contract_address,
                bt.blockchain_network,
                bt.mint_transaction_hash,

                cc.credit_id,
                cc.project_id,
                cp.project_name,
                cp.project_type,
                cp.description,
                cp.location,
                cp.estimated_co2_reduction,

                cc.quantity AS total_credit_quantity,
                cc.vintage_year,
                cc.issue_date,

                ml.quantity_listed,
                ml.quantity_available,
                ml.price_per_credit,
                ml.status,
                ml.listed_at,
                ml.expires_at

            FROM marketplace_listings ml

            INNER JOIN users seller
                ON ml.seller_id = seller.user_id

            INNER JOIN blockchain_tokens bt
                ON ml.blockchain_token_id = bt.blockchain_token_id

            INNER JOIN carbon_credits cc
                ON bt.credit_id = cc.credit_id

            INNER JOIN carbon_projects cp
                ON cc.project_id = cp.project_id

            WHERE ml.listing_id = ?
        `, [id]);

        if (listings.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Marketplace listing not found"
            });
        }

        res.json({
            success: true,
            data: listings[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve marketplace listing"
        });
    }
}


/*
    POST /api/marketplace/list

    Seller creates a marketplace listing.
*/
async function createListing(req, res) {
    try {
        const {
            blockchain_token_id,
            quantity,
            price_per_credit,
            expires_at
        } = req.body;

        if (
            !blockchain_token_id ||
            quantity === undefined ||
            price_per_credit === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Blockchain token ID, quantity and price are required"
            });
        }

        if (Number(quantity) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Listing quantity must be greater than zero"
            });
        }

        if (Number(price_per_credit) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Price per credit must be greater than zero"
            });
        }

        const [result] = await pool.execute(
            `CALL sp_create_listing(?, ?, ?, ?, ?)`,
            [
                req.user.user_id,
                blockchain_token_id,
                quantity,
                price_per_credit,
                expires_at || null
            ]
        );

        const listingId = result?.[0]?.[0]?.listing_id;

        res.status(201).json({
            success: true,
            message: "Carbon credits listed successfully",
            data: {
                listing_id: listingId,
                seller_id: req.user.user_id,
                blockchain_token_id,
                quantity,
                price_per_credit,
                expires_at: expires_at || null
            }
        });

    } catch (error) {
        console.error(error);

        res.status(400).json({
            success: false,
            message: error.sqlMessage || "Failed to create marketplace listing"
        });
    }
}


/*
    POST /api/marketplace/purchase

    Buyer purchases carbon credits.
*/
async function purchaseCredits(req, res) {
    try {
        const {
            listing_id,
            quantity,
            blockchain_tx_hash
        } = req.body;

        if (
            !listing_id ||
            quantity === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Listing ID and quantity are required"
            });
        }

        if (Number(quantity) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Purchase quantity must be greater than zero"
            });
        }

        const [result] = await pool.execute(
            `CALL sp_purchase_credits(?, ?, ?, ?)`,
            [
                listing_id,
                req.user.user_id,
                quantity,
                blockchain_tx_hash || null
            ]
        );

        const transactionId = result?.[0]?.[0]?.transaction_id;

        res.status(201).json({
            success: true,
            message: "Carbon credits purchased successfully",
            data: {
                transaction_id: transactionId,
                listing_id,
                buyer_id: req.user.user_id,
                quantity,
                blockchain_tx_hash: blockchain_tx_hash || null
            }
        });

    } catch (error) {
        console.error(error);

        res.status(400).json({
            success: false,
            message: error.sqlMessage || "Failed to purchase carbon credits"
        });
    }
}


/*
    GET /api/marketplace/my-listings

    Returns listings created by the logged-in seller.
*/
async function getMyListings(req, res) {
    try {
        const [listings] = await pool.execute(`
            SELECT
                ml.listing_id,
                ml.blockchain_token_id,
                cc.credit_id,
                cp.project_id,
                cp.project_name,
                ml.quantity_listed,
                ml.quantity_available,
                ml.price_per_credit,
                ml.status,
                ml.listed_at,
                ml.expires_at

            FROM marketplace_listings ml

            INNER JOIN blockchain_tokens bt
                ON ml.blockchain_token_id = bt.blockchain_token_id

            INNER JOIN carbon_credits cc
                ON bt.credit_id = cc.credit_id

            INNER JOIN carbon_projects cp
                ON cc.project_id = cp.project_id

            WHERE ml.seller_id = ?

            ORDER BY ml.listing_id DESC
        `, [req.user.user_id]);

        res.json({
            success: true,
            count: listings.length,
            data: listings
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve your marketplace listings"
        });
    }
}


/*
    GET /api/marketplace/my-transactions

    Returns transactions involving the logged-in user.
*/
async function getMyTransactions(req, res) {
    try {
        const [transactions] = await pool.execute(`
            SELECT
                t.transaction_id,
                t.listing_id,
                t.buyer_id,
                buyer.full_name AS buyer_name,
                t.seller_id,
                seller.full_name AS seller_name,

                t.blockchain_token_id,
                cp.project_id,
                cp.project_name,

                t.quantity,
                t.price_per_credit,
                t.total_amount,
                t.blockchain_tx_hash,
                t.transaction_status,
                t.transaction_date

            FROM transactions t

            INNER JOIN users buyer
                ON t.buyer_id = buyer.user_id

            INNER JOIN users seller
                ON t.seller_id = seller.user_id

            INNER JOIN blockchain_tokens bt
                ON t.blockchain_token_id = bt.blockchain_token_id

            INNER JOIN carbon_credits cc
                ON bt.credit_id = cc.credit_id

            INNER JOIN carbon_projects cp
                ON cc.project_id = cp.project_id

            WHERE t.buyer_id = ?
               OR t.seller_id = ?

            ORDER BY t.transaction_id DESC
        `, [
            req.user.user_id,
            req.user.user_id
        ]);

        res.json({
            success: true,
            count: transactions.length,
            data: transactions
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve transactions"
        });
    }
}


module.exports = {
    getMarketplaceListings,
    getMarketplaceListingById,
    createListing,
    purchaseCredits,
    getMyListings,
    getMyTransactions
};