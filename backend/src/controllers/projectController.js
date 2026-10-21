const { pool } = require("../config/database");

async function getCompanyByUserId(userId) {
    const [rows] = await pool.execute(
        `
        SELECT c.company_id, c.company_name, u.full_name
        FROM companies c
        INNER JOIN users u ON u.user_id = c.user_id
        WHERE c.user_id = ?
        LIMIT 1
        `,
        [userId]
    );

    return rows[0] || null;
}

function validateProjectInput(body) {
    const {
        project_name,
        project_type,
        description,
        location,
        estimated_co2_reduction,
        start_date,
        end_date
    } = body;

    if (
        !project_name?.trim() ||
        !project_type?.trim() ||
        !description?.trim() ||
        !location?.trim() ||
        estimated_co2_reduction === undefined ||
        estimated_co2_reduction === null ||
        !start_date ||
        !end_date
    ) {
        return "All project fields are required";
    }

    const co2 = Number(estimated_co2_reduction);
    if (!Number.isFinite(co2) || co2 <= 0) {
        return "Estimated CO2 reduction must be greater than zero";
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return "Invalid project dates";
    }

    if (end <= start) {
        return "End date must be after the start date";
    }

    return null;
}

async function getAllProjects(req, res) {
    try {
        const [projects] = await pool.execute(`
            SELECT
                cp.project_id,
                cp.owner_company_id,
                c.company_name,
                owner.full_name AS owner_name,
                cp.project_type_id,
                pt.type_name AS project_type,
                cp.description,
                cp.project_name,
                cp.location,
                cp.estimated_co2_reduction,
                cp.start_date,
                cp.end_date,
                cp.status,
                cp.created_at,
                cp.updated_at
            FROM carbon_projects cp
            INNER JOIN companies c
                ON c.company_id = cp.owner_company_id
            INNER JOIN users owner
                ON owner.user_id = c.user_id
            INNER JOIN project_types pt
                ON pt.project_type_id = cp.project_type_id
            ORDER BY cp.project_id DESC
        `);

        return res.json({
            success: true,
            count: projects.length,
            data: projects
        });
    } catch (error) {
        console.error("Get all projects error:", error);
        return res.status(500).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to retrieve carbon projects"
        });
    }
}

async function createProject(req, res) {
    try {
        if (!req.user?.user_id) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        if (req.user.role !== "COMPANY") {
            return res.status(403).json({
                success: false,
                message: "Only company users can create carbon projects"
            });
        }

        const validationError = validateProjectInput(req.body);
        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }

        const {
            project_name,
            project_type,
            description,
            location,
            estimated_co2_reduction,
            start_date,
            end_date
        } = req.body;

        const [result] = await pool.query(
            `CALL sp_create_project(?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.user_id,
                project_name.trim(),
                project_type.trim(),
                description.trim(),
                location.trim(),
                Number(estimated_co2_reduction),
                start_date,
                end_date
            ]
        );

        const projectId = result?.[0]?.[0]?.project_id || null;

        return res.status(201).json({
            success: true,
            message: "Carbon project created successfully",
            data: {
                project_id: projectId,
                project_name: project_name.trim(),
                project_type: project_type.trim(),
                status: "SUBMITTED"
            }
        });
    } catch (error) {
        console.error("Create project error:", error);
        return res.status(400).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to create carbon project"
        });
    }
}

async function getMyProjects(req, res) {
    try {
        if (!req.user?.user_id) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const company = await getCompanyByUserId(req.user.user_id);
        if (!company) {
            return res.status(404).json({ success: false, message: "Company profile not found" });
        }

        const [projects] = await pool.execute(`
            SELECT
                cp.project_id,
                cp.owner_company_id,
                c.company_name,
                owner.full_name AS owner_name,
                cp.project_type_id,
                pt.type_name AS project_type,
                cp.project_name,
                cp.description,
                cp.location,
                cp.estimated_co2_reduction,
                cp.start_date,
                cp.end_date,
                cp.status,
                cp.created_at,
                cp.updated_at,
                COALESCE(completion.credits_used, 0) AS credits_used
            FROM carbon_projects cp
            INNER JOIN companies c
                ON c.company_id = cp.owner_company_id
            INNER JOIN users owner
                ON owner.user_id = c.user_id
            INNER JOIN project_types pt
                ON pt.project_type_id = cp.project_type_id
            LEFT JOIN (
                SELECT pcr.project_id, pcr.credits_used
                FROM project_completion_reports pcr
                INNER JOIN (
                    SELECT project_id, MAX(completion_id) AS latest_completion_id
                    FROM project_completion_reports
                    GROUP BY project_id
                ) latest
                    ON latest.latest_completion_id = pcr.completion_id
            ) completion
                ON completion.project_id = cp.project_id
            WHERE cp.owner_company_id = ?
            ORDER BY cp.created_at DESC
        `, [company.company_id]);

        return res.json({ success: true, count: projects.length, data: projects });
    } catch (error) {
        console.error("Get my projects error:", error);
        return res.status(500).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to retrieve projects"
        });
    }
}

async function getProjectById(req, res) {
    try {
        if (!req.user?.user_id) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const { projectId } = req.params;
        if (!projectId) {
            return res.status(400).json({ success: false, message: "Project ID is required" });
        }

        const isCompany = req.user.role === "COMPANY";
        const company = isCompany ? await getCompanyByUserId(req.user.user_id) : null;

        if (isCompany && !company) {
            return res.status(404).json({ success: false, message: "Company profile not found" });
        }

        const ownershipClause = isCompany ? "AND cp.owner_company_id = ?" : "";
        const params = isCompany ? [projectId, company.company_id] : [projectId];

        const [projects] = await pool.execute(`
            SELECT
                cp.project_id,
                cp.owner_company_id,
                c.company_name,
                owner.full_name AS owner_name,
                cp.project_type_id,
                pt.type_name AS project_type,
                pt.description AS project_type_description,
                cp.project_name,
                cp.description,
                cp.location,
                cp.estimated_co2_reduction,
                cp.start_date,
                cp.end_date,
                cp.status,
                cp.created_at,
                cp.updated_at
            FROM carbon_projects cp
            INNER JOIN companies c
                ON c.company_id = cp.owner_company_id
            INNER JOIN users owner
                ON owner.user_id = c.user_id
            INNER JOIN project_types pt
                ON pt.project_type_id = cp.project_type_id
            WHERE cp.project_id = ?
            ${ownershipClause}
            LIMIT 1
        `, params);

        if (projects.length === 0) {
            return res.status(404).json({ success: false, message: "Project not found or access denied" });
        }

        const [verifications] = await pool.execute(`
            SELECT
                pv.verification_id,
                pv.project_id,
                pv.verifier_id,
                verifier.full_name AS verifier_name,
                verifier.email AS verifier_email,
                pv.verification_stage,
                pv.verified_co2_reduction,
                pv.credits_used,
                pv.status,
                pv.remarks,
                pv.verified_at
            FROM project_verifications pv
            INNER JOIN users verifier
                ON verifier.user_id = pv.verifier_id
            WHERE pv.project_id = ?
            ORDER BY pv.verification_id DESC
        `, [projectId]);

        const [completionReports] = await pool.execute(`
            SELECT
                pcr.completion_id,
                pcr.project_id,
                pcr.verifier_id,
                verifier.full_name AS verifier_name,
                pcr.credits_used,
                pcr.remarks,
                pcr.verified_at
            FROM project_completion_reports pcr
            INNER JOIN users verifier
                ON verifier.user_id = pcr.verifier_id
            WHERE pcr.project_id = ?
            ORDER BY pcr.completion_id DESC
        `, [projectId]);

        const [creditUsage] = await pool.execute(`
            SELECT
                cur.usage_report_id,
                cur.completion_id,
                cur.credits_used,
                cur.reported_at
            FROM credit_usage_reports cur
            INNER JOIN project_completion_reports pcr
                ON pcr.completion_id = cur.completion_id
            WHERE pcr.project_id = ?
            ORDER BY cur.usage_report_id DESC
        `, [projectId]);

        const [credits] = await pool.execute(`
            SELECT
                cc.credit_id,
                cc.quantity,
                cc.vintage_year,
                cc.issue_date,
                cc.status,
                cc.verification_id
            FROM carbon_credits cc
            INNER JOIN project_verifications pv
                ON pv.verification_id = cc.verification_id
            WHERE pv.project_id = ?
            ORDER BY cc.credit_id DESC
        `, [projectId]);

        return res.json({
            success: true,
            data: {
                ...projects[0],
                estimated_co2_reduction: Number(projects[0].estimated_co2_reduction),
                verifications,
                completion_reports: completionReports,
                credit_usage: creditUsage,
                credits
            }
        });
    } catch (error) {
        console.error("Get project by ID error:", error);
        return res.status(500).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to retrieve project"
        });
    }
}

async function updateProject(req, res) {
    if (!req.user?.user_id) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (req.user.role !== "COMPANY") {
        return res.status(403).json({ success: false, message: "Only company users can update projects" });
    }

    const validationError = validateProjectInput(req.body);
    if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
    }

    const { projectId } = req.params;
    const {
        project_name,
        project_type,
        description,
        location,
        estimated_co2_reduction,
        start_date,
        end_date
    } = req.body;

    const company = await getCompanyByUserId(req.user.user_id);
    if (!company) {
        return res.status(404).json({ success: false, message: "Company profile not found" });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [projects] = await connection.execute(`
            SELECT project_id, status
            FROM carbon_projects
            WHERE project_id = ? AND owner_company_id = ?
            FOR UPDATE
        `, [projectId, company.company_id]);

        if (projects.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "Project not found or access denied" });
        }

        if (projects[0].status !== "SUBMITTED") {
            await connection.rollback();
            return res.status(400).json({ success: false, message: "Only submitted projects can be updated" });
        }

        const [projectTypes] = await connection.execute(`
            SELECT project_type_id
            FROM project_types
            WHERE LOWER(TRIM(type_name)) = LOWER(TRIM(?))
            LIMIT 1
        `, [project_type]);

        if (projectTypes.length === 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: "Invalid project type" });
        }

        await connection.execute(`
            UPDATE carbon_projects
            SET
                project_type_id = ?,
                project_name = ?,
                description = ?,
                location = ?,
                estimated_co2_reduction = ?,
                start_date = ?,
                end_date = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE project_id = ? AND owner_company_id = ?
        `, [
            projectTypes[0].project_type_id,
            project_name.trim(),
            description.trim(),
            location.trim(),
            Number(estimated_co2_reduction),
            start_date,
            end_date,
            projectId,
            company.company_id
        ]);

        await connection.commit();
        return res.json({ success: true, message: "Project updated successfully" });
    } catch (error) {
        await connection.rollback();
        console.error("Update project error:", error);
        return res.status(500).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to update project"
        });
    } finally {
        connection.release();
    }
}

async function deleteProject(req, res) {
    if (!req.user?.user_id) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (req.user.role !== "COMPANY") {
        return res.status(403).json({ success: false, message: "Only company users can delete projects" });
    }

    const company = await getCompanyByUserId(req.user.user_id);
    if (!company) {
        return res.status(404).json({ success: false, message: "Company profile not found" });
    }

    const { projectId } = req.params;
    if (!projectId) {
        return res.status(400).json({ success: false, message: "Project ID is required" });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [projects] = await connection.execute(`
            SELECT project_id, status
            FROM carbon_projects
            WHERE project_id = ? AND owner_company_id = ?
            FOR UPDATE
        `, [projectId, company.company_id]);

        if (projects.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "Project not found or access denied" });
        }

        if (!["SUBMITTED", "REJECTED"].includes(projects[0].status)) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "This project cannot be deleted in its current status"
            });
        }

        // These tables do not all have ON DELETE CASCADE in the normalized schema.
        await connection.execute(`DELETE FROM price_change_requests WHERE project_id = ?`, [projectId]);
        await connection.execute(`DELETE FROM credit_price_approvals WHERE project_id = ?`, [projectId]);
        await connection.execute(`DELETE FROM verification_notifications WHERE project_id = ?`, [projectId]);
        await connection.execute(`DELETE FROM project_verifications WHERE project_id = ?`, [projectId]);

        const [result] = await connection.execute(`
            DELETE FROM carbon_projects
            WHERE project_id = ? AND owner_company_id = ?
        `, [projectId, company.company_id]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "Project could not be deleted" });
        }

        await connection.commit();
        return res.json({ success: true, message: "Project deleted successfully" });
    } catch (error) {
        await connection.rollback();
        console.error("Delete project error:", error);
        return res.status(500).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to delete project"
        });
    } finally {
        connection.release();
    }
}

module.exports = {
    getAllProjects,
    createProject,
    getMyProjects,
    getProjectById,
    updateProject,
    deleteProject
};
