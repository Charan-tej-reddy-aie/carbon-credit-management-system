const express = require("express");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");
const { getDashboardAnalytics, getMarketAnalytics, getPredictions, getTokenTransfers } = require("../controllers/analyticsController");
const router = express.Router();
router.get("/dashboard", authenticateToken, authorizeRoles("ADMIN"), getDashboardAnalytics);
router.get("/market", authenticateToken, authorizeRoles("ADMIN", "COMPANY", "VERIFIER"), getMarketAnalytics);
router.get("/predictions", authenticateToken, authorizeRoles("ADMIN", "COMPANY", "VERIFIER"), getPredictions);
router.get("/token-transfers", authenticateToken, authorizeRoles("ADMIN", "COMPANY", "VERIFIER"), getTokenTransfers);
module.exports = router;
