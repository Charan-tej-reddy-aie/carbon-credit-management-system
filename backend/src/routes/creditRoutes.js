const express = require("express");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");
const {
    getIssuanceQueue, issueCredits, getMyCredits,
    getTokenizationQueue, tokenizeCredit, retireCredits, getMyRetirements
} = require("../controllers/creditController");

const router = express.Router();
router.get("/issuance-queue", authenticateToken, authorizeRoles("ADMIN"), getIssuanceQueue);
router.post("/issue", authenticateToken, authorizeRoles("ADMIN"), issueCredits);
router.get("/my", authenticateToken, authorizeRoles("COMPANY"), getMyCredits);
router.get("/tokenization-queue", authenticateToken, authorizeRoles("ADMIN"), getTokenizationQueue);
router.post("/tokenize", authenticateToken, authorizeRoles("ADMIN"), tokenizeCredit);
router.post("/retire", authenticateToken, authorizeRoles("COMPANY"), retireCredits);
router.get("/retirements", authenticateToken, authorizeRoles("COMPANY"), getMyRetirements);
module.exports = router;
