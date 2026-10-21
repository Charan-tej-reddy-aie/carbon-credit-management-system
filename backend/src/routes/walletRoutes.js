const express = require("express");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");
const { getWallet, updateWallet } = require("../controllers/walletController");

const router = express.Router();

router.get("/", authenticateToken, authorizeRoles("COMPANY"), getWallet);
router.put("/", authenticateToken, authorizeRoles("COMPANY"), updateWallet);

module.exports = router;
