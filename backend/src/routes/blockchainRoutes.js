const express = require("express");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");
const controller = require("../controllers/blockchainController");

const router = express.Router();
router.get("/overview", authenticateToken, authorizeRoles("ADMIN", "COMPANY", "VERIFIER"), controller.getOverview);
router.get("/tokens", authenticateToken, authorizeRoles("ADMIN", "COMPANY", "VERIFIER"), controller.getTokens);
router.get("/transfers", authenticateToken, authorizeRoles("ADMIN", "COMPANY", "VERIFIER"), controller.getTransfers);
router.get("/transactions", authenticateToken, authorizeRoles("ADMIN", "COMPANY", "VERIFIER"), controller.getTransactions);
router.get("/retirements", authenticateToken, authorizeRoles("ADMIN", "COMPANY", "VERIFIER"), controller.getRetirements);
router.get("/tokens/:id", authenticateToken, authorizeRoles("ADMIN", "COMPANY", "VERIFIER"), controller.getTokenDetails);
module.exports = router;
