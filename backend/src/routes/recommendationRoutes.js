const express = require("express");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");
const { getPriceRecommendation } = require("../controllers/pricingRecommendationController");

const router = express.Router();
router.get("/:projectId", authenticateToken, authorizeRoles("ADMIN", "VERIFIER"), getPriceRecommendation);
module.exports = router;
