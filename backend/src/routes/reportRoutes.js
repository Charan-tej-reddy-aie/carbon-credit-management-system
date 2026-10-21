const express = require("express");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");
const { getAdminReport, exportReport } = require("../controllers/reportController");

const router = express.Router();
router.use(authenticateToken, authorizeRoles("ADMIN"));
router.get("/admin", getAdminReport);
router.get("/export/:type", exportReport);
module.exports = router;
