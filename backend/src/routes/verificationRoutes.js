const express = require("express");
const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");
const {
    createVerification,
    getVerifications,
    getVerificationByProject,
    getPendingNotifications
} = require("../controllers/verificationController");

const router = express.Router();

router.get(
    "/",
    authenticateToken,
    authorizeRoles("ADMIN", "VERIFIER"),
    getVerifications
);

router.get(
    "/pending",
    authenticateToken,
    authorizeRoles("VERIFIER"),
    getPendingNotifications
);

router.get(
    "/project/:projectId",
    authenticateToken,
    authorizeRoles("ADMIN", "VERIFIER"),
    getVerificationByProject
);

router.post(
    "/",
    authenticateToken,
    authorizeRoles("VERIFIER"),
    createVerification
);

module.exports = router;
