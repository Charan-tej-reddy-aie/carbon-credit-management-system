const express = require("express");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const {
    createVerification,
    getVerifications,
    getVerificationByProject
} = require("../controllers/verificationController");

const router = express.Router();

router.get(
    "/",
    authenticateToken,
    authorizeRoles("ADMIN", "VERIFIER"),
    getVerifications
);

router.get(
    "/project/:projectId",
    authenticateToken,
    getVerificationByProject
);

router.post(
    "/",
    authenticateToken,
    authorizeRoles("ADMIN", "VERIFIER"),
    createVerification
);

module.exports = router;