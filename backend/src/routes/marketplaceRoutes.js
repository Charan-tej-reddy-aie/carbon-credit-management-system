const express = require("express");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const {
    getMarketplaceListings,
    getMarketplaceListingById,
    createListing,
    purchaseCredits,
    getMyListings,
    getMyTransactions
} = require("../controllers/marketplaceController");

const router = express.Router();

// Public marketplace listings
router.get(
    "/",
    getMarketplaceListings
);

// Seller's own listings
router.get(
    "/my-listings",
    authenticateToken,
    authorizeRoles("SELLER"),
    getMyListings
);

// User's transactions
router.get(
    "/my-transactions",
    authenticateToken,
    authorizeRoles("BUYER", "SELLER"),
    getMyTransactions
);

// Create marketplace listing
router.post(
    "/list",
    authenticateToken,
    authorizeRoles("SELLER"),
    createListing
);

// Purchase carbon credits
router.post(
    "/purchase",
    authenticateToken,
    authorizeRoles("BUYER"),
    purchaseCredits
);

// Get one listing
router.get(
    "/:id",
    getMarketplaceListingById
);

module.exports = router;