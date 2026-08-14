const express = require("express");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const {
    createProject,
    getProjectById,
    getMyProjects,
    updateProject,
    deleteProject
} = require("../controllers/projectController");

const { pool } = require("../config/database");

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const [projects] = await pool.execute(`
            SELECT
                cp.project_id,
                cp.owner_id,
                u.full_name AS owner_name,
                u.company_name,
                cp.project_name,
                cp.project_type,
                cp.description,
                cp.location,
                cp.estimated_co2_reduction,
                cp.start_date,
                cp.end_date,
                cp.status
            FROM carbon_projects cp
            INNER JOIN users u
                ON cp.owner_id = u.user_id
            ORDER BY cp.project_id DESC
        `);

        res.json({
            success: true,
            count: projects.length,
            data: projects
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve carbon projects"
        });
    }
});

router.get(
    "/my",
    authenticateToken,
    authorizeRoles("SELLER"),
    getMyProjects
);

router.get(
    "/:id",
    getProjectById
);

router.post(
    "/",
    authenticateToken,
    authorizeRoles("SELLER"),
    createProject
);

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("SELLER"),
    updateProject
);

router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles("SELLER"),
    deleteProject
);

module.exports = router;