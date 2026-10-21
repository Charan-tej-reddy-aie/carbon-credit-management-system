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
    getMySellableCredits,
    getMyTransactions,
    getMyCreditSummary,
    requestPriceChange
} = require("../controllers/marketplaceController");

const router = express.Router();

router.get("/", getMarketplaceListings);

router.get(
    "/credit-summary",
    authenticateToken,
    authorizeRoles("COMPANY"),
    getMyCreditSummary
);

router.get(
    "/my-sellable-credits",
    authenticateToken,
    authorizeRoles("COMPANY"),
    getMySellableCredits
);

router.get(
    "/my-listings",
    authenticateToken,
    authorizeRoles("COMPANY"),
    getMyListings
);

router.get(
    "/my-transactions",
    authenticateToken,
    authorizeRoles("COMPANY"),
    getMyTransactions
);

router.post(
    "/list",
    authenticateToken,
    authorizeRoles("COMPANY"),
    createListing
);

router.post(
    "/purchase",
    authenticateToken,
    authorizeRoles("COMPANY"),
    purchaseCredits
);

router.post(
    "/price-request",
    authenticateToken,
    authorizeRoles("COMPANY"),
    requestPriceChange
);

router.get("/:id", getMarketplaceListingById);

module.exports = router;
