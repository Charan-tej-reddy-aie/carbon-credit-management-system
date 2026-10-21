const express = require("express");
const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");
const {
    getAllProjects,
    createProject,
    getProjectById,
    getMyProjects,
    updateProject,
    deleteProject
} = require("../controllers/projectController");

const router = express.Router();

router.get(
    "/",
    authenticateToken,
    authorizeRoles("COMPANY", "VERIFIER", "ADMIN"),
    getAllProjects
);

router.get(
    "/my",
    authenticateToken,
    authorizeRoles("COMPANY"),
    getMyProjects
);

router.get(
    "/:projectId",
    authenticateToken,
    authorizeRoles("COMPANY", "VERIFIER", "ADMIN"),
    getProjectById
);

router.post(
    "/",
    authenticateToken,
    authorizeRoles("COMPANY"),
    createProject
);

router.put(
    "/:projectId",
    authenticateToken,
    authorizeRoles("COMPANY"),
    updateProject
);

router.delete(
    "/:projectId",
    authenticateToken,
    authorizeRoles("COMPANY"),
    deleteProject
);

module.exports = router;
