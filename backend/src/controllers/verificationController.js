const { pool } = require("../config/database");

async function createVerification(req, res) {
    const connection = await pool.getConnection();

    try {
        const {
            project_id,
            verified_co2_reduction,
            status,
            remarks
        } = req.body;

        if (
            !project_id ||
            verified_co2_reduction === undefined ||
            !status
        ) {
            return res.status(400).json({
                success: false,
                message: "Project ID, verified CO2 reduction and status are required"
            });
        }

        const normalizedStatus = status.toUpperCase();

        if (!["APPROVED", "REJECTED"].includes(normalizedStatus)) {
            return res.status(400).json({
                success: false,
                message: "Verification status must be APPROVED or REJECTED"
            });
        }

        if (Number(verified_co2_reduction) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Verified CO2 reduction must be greater than zero"
            });
        }

        const [projects] = await connection.execute(
            `SELECT
                project_id,
                estimated_co2_reduction,
                status
             FROM carbon_projects
             WHERE project_id = ?`,
            [project_id]
        );

        if (projects.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Carbon project not found"
            });
        }

        const project = projects[0];

        if (project.status !== "SUBMITTED") {
            return res.status(400).json({
                success: false,
                message: "Only submitted projects can be verified"
            });
        }

        if (
            Number(verified_co2_reduction) >
            Number(project.estimated_co2_reduction)
        ) {
            return res.status(400).json({
                success: false,
                message: "Verified CO2 reduction cannot exceed estimated CO2 reduction"
            });
        }

        await connection.beginTransaction();

        await connection.execute(
            `INSERT INTO project_verifications
            (
                project_id,
                verifier_id,
                verified_co2_reduction,
                status,
                remarks
            )
            VALUES (?, ?, ?, ?, ?)`,
            [
                project_id,
                req.user.user_id,
                verified_co2_reduction,
                normalizedStatus,
                remarks || null
            ]
        );

        const projectStatus =
            normalizedStatus === "APPROVED"
                ? "APPROVED"
                : "REJECTED";

        await connection.execute(
            `UPDATE carbon_projects
             SET status = ?
             WHERE project_id = ?`,
            [projectStatus, project_id]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: `Project verification ${normalizedStatus.toLowerCase()} successfully`,
            data: {
                project_id,
                verifier_id: req.user.user_id,
                verified_co2_reduction,
                status: normalizedStatus
            }
        });
    } catch (error) {
        await connection.rollback();

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to verify carbon project"
        });
    } finally {
        connection.release();
    }
}

async function getVerifications(req, res) {
    try {
        const [verifications] = await pool.execute(
            `SELECT
                pv.verification_id,
                pv.project_id,
                cp.project_name,
                pv.verifier_id,
                u.full_name AS verifier_name,
                pv.verified_co2_reduction,
                pv.status,
                pv.remarks,
                pv.verified_at
            FROM project_verifications pv
            INNER JOIN carbon_projects cp
                ON pv.project_id = cp.project_id
            INNER JOIN users u
                ON pv.verifier_id = u.user_id
            ORDER BY pv.verification_id DESC`
        );

        res.json({
            success: true,
            count: verifications.length,
            data: verifications
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve project verifications"
        });
    }
}

async function getVerificationByProject(req, res) {
    try {
        const { projectId } = req.params;

        const [verifications] = await pool.execute(
            `SELECT
                pv.verification_id,
                pv.project_id,
                cp.project_name,
                pv.verifier_id,
                u.full_name AS verifier_name,
                pv.verified_co2_reduction,
                pv.status,
                pv.remarks,
                pv.verified_at
            FROM project_verifications pv
            INNER JOIN carbon_projects cp
                ON pv.project_id = cp.project_id
            INNER JOIN users u
                ON pv.verifier_id = u.user_id
            WHERE pv.project_id = ?
            ORDER BY pv.verification_id DESC`,
            [projectId]
        );

        res.json({
            success: true,
            count: verifications.length,
            data: verifications
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve project verification"
        });
    }
}

module.exports = {
    createVerification,
    getVerifications,
    getVerificationByProject
};