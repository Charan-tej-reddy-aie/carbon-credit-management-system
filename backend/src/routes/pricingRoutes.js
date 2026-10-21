const express = require("express");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");
const { getPricingProjects, approvePrice, getPendingPriceRequests, reviewPriceRequest } = require("../controllers/pricingController");
const router = express.Router();
router.get("/projects", authenticateToken, authorizeRoles("VERIFIER"), getPricingProjects);
router.post("/approve", authenticateToken, authorizeRoles("VERIFIER"), approvePrice);
router.get("/pending", authenticateToken, authorizeRoles("VERIFIER"), getPendingPriceRequests);
router.post("/review", authenticateToken, authorizeRoles("VERIFIER"), reviewPriceRequest);
module.exports = router;
