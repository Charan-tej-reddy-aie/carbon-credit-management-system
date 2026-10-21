const express = require("express");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");
const { generatePrediction, getMarketSummary } = require("../controllers/marketPredictionController");

const router = express.Router();
router.get("/summary", authenticateToken, authorizeRoles("ADMIN", "COMPANY", "VERIFIER"), getMarketSummary);
router.post("/generate", authenticateToken, authorizeRoles("ADMIN", "VERIFIER"), generatePrediction);
module.exports = router;
