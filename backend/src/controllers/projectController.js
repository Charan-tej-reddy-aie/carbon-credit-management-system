const { pool } = require("../config/database");

async function createProject(req, res) {
    try {
        const {
            project_name,
            project_type,
            description,
            location,
            estimated_co2_reduction,
            start_date,
            end_date
        } = req.body;

        if (
            !project_name ||
            !project_type ||
            !description ||
            !location ||
            estimated_co2_reduction === undefined ||
            !start_date ||
            !end_date
        ) {
            return res.status(400).json({
                success: false,
                message: "All project fields are required"
            });
        }

        if (Number(estimated_co2_reduction) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Estimated CO2 reduction must be greater than zero"
            });
        }

        if (new Date(end_date) <= new Date(start_date)) {
            return res.status(400).json({
                success: false,
                message: "End date must be after start date"
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO carbon_projects
            (
                owner_id,
                project_name,
                project_type,
                description,
                location,
                estimated_co2_reduction,
                start_date,
                end_date,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')`,
            [
                req.user.user_id,
                project_name,
                project_type,
                description,
                location,
                estimated_co2_reduction,
                start_date,
                end_date
            ]
        );

        res.status(201).json({
            success: true,
            message: "Carbon project submitted successfully",
            data: {
                project_id: result.insertId,
                owner_id: req.user.user_id,
                project_name,
                status: "SUBMITTED"
            }
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to create carbon project"
        });
    }
}

async function getProjectById(req, res) {
    try {
        const { id } = req.params;

        const [projects] = await pool.execute(
            `SELECT
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
                cp.status,
                cp.created_at,
                cp.updated_at
            FROM carbon_projects cp
            INNER JOIN users u
                ON cp.owner_id = u.user_id
            WHERE cp.project_id = ?`,
            [id]
        );

        if (projects.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Carbon project not found"
            });
        }

        res.json({
            success: true,
            data: projects[0]
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve carbon project"
        });
    }
}

async function getMyProjects(req, res) {
    try {
        const [projects] = await pool.execute(
            `SELECT
                project_id,
                project_name,
                project_type,
                description,
                location,
                estimated_co2_reduction,
                start_date,
                end_date,
                status,
                created_at,
                updated_at
            FROM carbon_projects
            WHERE owner_id = ?
            ORDER BY project_id DESC`,
            [req.user.user_id]
        );

        res.json({
            success: true,
            count: projects.length,
            data: projects
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve your projects"
        });
    }
}

async function updateProject(req, res) {
    try {
        const { id } = req.params;

        const {
            project_name,
            project_type,
            description,
            location,
            estimated_co2_reduction,
            start_date,
            end_date
        } = req.body;

        const [projects] = await pool.execute(
            `SELECT
                project_id,
                owner_id,
                status
            FROM carbon_projects
            WHERE project_id = ?`,
            [id]
        );

        if (projects.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Carbon project not found"
            });
        }

        const project = projects[0];

        if (project.owner_id !== req.user.user_id) {
            return res.status(403).json({
                success: false,
                message: "You can only modify your own projects"
            });
        }

        if (project.status !== "SUBMITTED") {
            return res.status(400).json({
                success: false,
                message: "Only submitted projects can be modified"
            });
        }

        if (
            !project_name ||
            !project_type ||
            !description ||
            !location ||
            estimated_co2_reduction === undefined ||
            !start_date ||
            !end_date
        ) {
            return res.status(400).json({
                success: false,
                message: "All project fields are required"
            });
        }

        if (Number(estimated_co2_reduction) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Estimated CO2 reduction must be greater than zero"
            });
        }

        if (new Date(end_date) <= new Date(start_date)) {
            return res.status(400).json({
                success: false,
                message: "End date must be after start date"
            });
        }

        await pool.execute(
            `UPDATE carbon_projects
            SET
                project_name = ?,
                project_type = ?,
                description = ?,
                location = ?,
                estimated_co2_reduction = ?,
                start_date = ?,
                end_date = ?
            WHERE project_id = ?`,
            [
                project_name,
                project_type,
                description,
                location,
                estimated_co2_reduction,
                start_date,
                end_date,
                id
            ]
        );

        res.json({
            success: true,
            message: "Carbon project updated successfully"
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to update carbon project"
        });
    }
}

async function deleteProject(req, res) {
    try {
        const { id } = req.params;

        const [projects] = await pool.execute(
            `SELECT
                project_id,
                owner_id,
                status
            FROM carbon_projects
            WHERE project_id = ?`,
            [id]
        );

        if (projects.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Carbon project not found"
            });
        }

        const project = projects[0];

        if (project.owner_id !== req.user.user_id) {
            return res.status(403).json({
                success: false,
                message: "You can only delete your own projects"
            });
        }

        if (project.status !== "SUBMITTED") {
            return res.status(400).json({
                success: false,
                message: "Only submitted projects can be deleted"
            });
        }

        await pool.execute(
            `DELETE FROM carbon_projects
             WHERE project_id = ?`,
            [id]
        );

        res.json({
            success: true,
            message: "Carbon project deleted successfully"
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to delete carbon project"
        });
    }
}

module.exports = {
    createProject,
    getProjectById,
    getMyProjects,
    updateProject,
    deleteProject
};