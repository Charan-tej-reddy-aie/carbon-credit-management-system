const { pool } = require("../config/database");

async function createVerification(req, res) {
    const connection = await pool.getConnection();

    try {
        const {
            project_id,
            verified_co2_reduction,
            credits_used,
            status,
            remarks,
            notification_id
        } = req.body;

        if (!project_id || !notification_id || !status) {
            return res.status(400).json({
                success: false,
                message: "Project ID, notification ID and status are required"
            });
        }

        const normalizedStatus = String(status).trim().toUpperCase();
        if (!["APPROVED", "REJECTED"].includes(normalizedStatus)) {
            return res.status(400).json({
                success: false,
                message: "Verification status must be APPROVED or REJECTED"
            });
        }

        if (
            verified_co2_reduction !== undefined &&
            verified_co2_reduction !== null &&
            verified_co2_reduction !== "" &&
            (!Number.isFinite(Number(verified_co2_reduction)) || Number(verified_co2_reduction) < 0)
        ) {
            return res.status(400).json({
                success: false,
                message: "Verified CO2 reduction must be a valid non-negative number"
            });
        }

        if (
            credits_used !== undefined &&
            credits_used !== null &&
            credits_used !== "" &&
            (!Number.isFinite(Number(credits_used)) || Number(credits_used) < 0)
        ) {
            return res.status(400).json({
                success: false,
                message: "Credits used must be a valid non-negative number"
            });
        }

        const [notifications] = await connection.execute(`
            SELECT
                notification_id,
                project_id,
                verifier_id,
                notification_type,
                notification_status
            FROM verification_notifications
            WHERE notification_id = ?
              AND project_id = ?
            LIMIT 1
        `, [notification_id, project_id]);

        if (notifications.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Verification notification not found"
            });
        }

        const notification = notifications[0];
        if (notification.notification_status !== "PENDING") {
            return res.status(400).json({
                success: false,
                message: "This verification notification has already been processed"
            });
        }

        const [projects] = await connection.execute(`
            SELECT project_id, status
            FROM carbon_projects
            WHERE project_id = ?
            LIMIT 1
        `, [project_id]);

        if (projects.length === 0) {
            return res.status(404).json({ success: false, message: "Carbon project not found" });
        }

        const project = projects[0];

        if (notification.notification_type === "START_APPROVAL") {
            const verifiedCo2 =
                verified_co2_reduction === undefined || verified_co2_reduction === null || verified_co2_reduction === ""
                    ? null
                    : Number(verified_co2_reduction);

            const [result] = await connection.query(
                `CALL sp_verify_project(?, ?, ?, ?, ?)`,
                [
                    Number(project_id),
                    req.user.user_id,
                    verifiedCo2,
                    normalizedStatus,
                    remarks?.trim() || null
                ]
            );

            return res.status(201).json({
                success: true,
                message:
                    normalizedStatus === "APPROVED"
                        ? "Project approved and moved to in-progress"
                        : "Project rejected successfully",
                data: {
                    project_id: Number(project_id),
                    verifier_id: req.user.user_id,
                    status: normalizedStatus,
                    stage: "START_APPROVAL",
                    verification_id: result?.[0]?.[0]?.verification_id || null
                }
            });
        }

        if (notification.notification_type === "COMPLETION_REVIEW") {
            if (project.status !== "IN_PROGRESS" && project.status !== "COMPLETION_PENDING") {
                return res.status(400).json({
                    success: false,
                    message: "Project is not awaiting completion review"
                });
            }

            if (verified_co2_reduction === undefined || verified_co2_reduction === null || verified_co2_reduction === "") {
                return res.status(400).json({
                    success: false,
                    message: "Verified CO2 reduction is required for completion verification"
                });
            }

            if (credits_used === undefined || credits_used === null || credits_used === "") {
                return res.status(400).json({
                    success: false,
                    message: "Credits used are required for completion verification"
                });
            }

            const verifiedCo2 = Number(verified_co2_reduction);
            const usedCredits = Number(credits_used);

            if (!Number.isFinite(verifiedCo2) || verifiedCo2 < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Verified CO2 reduction cannot be negative"
                });
            }

            if (!Number.isFinite(usedCredits) || usedCredits < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Credits used cannot be negative"
                });
            }

            if (usedCredits > verifiedCo2) {
                return res.status(400).json({
                    success: false,
                    message: "Credits used cannot exceed verified CO2 reduction"
                });
            }

            if (normalizedStatus === "REJECTED") {
                await connection.beginTransaction();

                await connection.execute(`
                    INSERT INTO project_verifications
                    (
                        project_id,
                        verifier_id,
                        verification_stage,
                        verified_co2_reduction,
                        credits_used,
                        status,
                        remarks
                    )
                    VALUES (?, ?, 'COMPLETION_REVIEW', ?, ?, 'REJECTED', ?)
                `, [
                    project_id,
                    req.user.user_id,
                    verifiedCo2,
                    usedCredits,
                    remarks?.trim() || null
                ]);

                await connection.execute(`
                    UPDATE carbon_projects
                    SET status = 'REJECTED'
                    WHERE project_id = ?
                `, [project_id]);

                await connection.execute(`
                    UPDATE verification_notifications
                    SET notification_status = 'COMPLETED',
                        completed_at = CURRENT_TIMESTAMP
                    WHERE notification_id = ?
                `, [notification_id]);

                await connection.commit();

                return res.status(201).json({
                    success: true,
                    message: "Project completion rejected",
                    data: {
                        project_id: Number(project_id),
                        verifier_id: req.user.user_id,
                        status: "REJECTED",
                        verified_co2_reduction: verifiedCo2,
                        credits_used: usedCredits,
                        stage: "COMPLETION_REVIEW"
                    }
                });
            }

            // The normalized stored procedure creates the completion report,
            // completion verification, usage report and closes the notification.
            const [result] = await connection.query(
                `CALL sp_complete_project(?, ?, ?, ?)`,
                [
                    Number(project_id),
                    req.user.user_id,
                    usedCredits,
                    remarks?.trim() || null
                ]
            );

            const procedureResult = result?.[0]?.[0] || null;

            return res.status(201).json({
                success: true,
                message: "Project completion verified successfully",
                data: {
                    project_id: Number(project_id),
                    verifier_id: req.user.user_id,
                    status: "APPROVED",
                    verified_co2_reduction: verifiedCo2,
                    credits_used: usedCredits,
                    stage: "COMPLETION_REVIEW",
                    completion_id: procedureResult?.completion_id || null,
                    verification_id: procedureResult?.verification_id || null
                }
            });
        }

        return res.status(400).json({
            success: false,
            message: "Invalid verification notification type"
        });
    } catch (error) {
        try {
            await connection.rollback();
        } catch (_) {
            // Ignore rollback errors when no transaction is active.
        }

        console.error("Create verification error:", error);
        return res.status(400).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to verify carbon project"
        });
    } finally {
        connection.release();
    }
}

async function getVerifications(req, res) {
    try {
        const [verifications] = await pool.execute(`
            SELECT
                pv.verification_id,
                pv.project_id,
                cp.project_name,
                cp.status AS project_status,
                c.company_name,
                pt.type_name AS project_type,
                pv.verifier_id,
                verifier.full_name AS verifier_name,
                pv.verified_co2_reduction,
                pv.credits_used,
                pv.verification_stage,
                pv.status,
                pv.remarks,
                pv.verified_at
            FROM project_verifications pv
            INNER JOIN carbon_projects cp
                ON cp.project_id = pv.project_id
            INNER JOIN companies c
                ON c.company_id = cp.owner_company_id
            INNER JOIN project_types pt
                ON pt.project_type_id = cp.project_type_id
            INNER JOIN users verifier
                ON verifier.user_id = pv.verifier_id
            ORDER BY pv.verification_id DESC
        `);

        return res.json({ success: true, count: verifications.length, data: verifications });
    } catch (error) {
        console.error("Get verifications error:", error);
        return res.status(500).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to retrieve project verifications"
        });
    }
}

async function getVerificationByProject(req, res) {
    try {
        const { projectId } = req.params;
        if (!projectId) {
            return res.status(400).json({ success: false, message: "Project ID is required" });
        }

        const [projects] = await pool.execute(`
            SELECT
                cp.project_id,
                cp.owner_company_id,
                c.company_name,
                owner.full_name AS owner_name,
                cp.project_name,
                cp.project_type_id,
                pt.type_name AS project_type,
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
            LIMIT 1
        `, [projectId]);

        if (projects.length === 0) {
            return res.status(404).json({ success: false, message: "Carbon project not found" });
        }

        const [notifications] = await pool.execute(`
            SELECT
                notification_id,
                project_id,
                verifier_id,
                notification_type,
                notification_status,
                created_at,
                completed_at
            FROM verification_notifications
            WHERE project_id = ?
              AND notification_status = 'PENDING'
            ORDER BY notification_id ASC
            LIMIT 1
        `, [projectId]);

        const [verifications] = await pool.execute(`
            SELECT
                pv.verification_id,
                pv.project_id,
                pv.verifier_id,
                verifier.full_name AS verifier_name,
                pv.verified_co2_reduction,
                pv.credits_used,
                pv.verification_stage,
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

        return res.json({
            success: true,
            data: {
                ...projects[0],
                notification: notifications[0] || null,
                verifications,
                completion_reports: completionReports
            }
        });
    } catch (error) {
        console.error("Get verification project error:", error);
        return res.status(500).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to retrieve project for verification"
        });
    }
}

async function getPendingNotifications(req, res) {
    try {
        const [notifications] = await pool.execute(`
            SELECT
                vn.notification_id,
                vn.project_id,
                vn.verifier_id,
                vn.notification_type,
                vn.notification_status,
                vn.created_at,
                cp.project_name,
                pt.type_name AS project_type,
                cp.description,
                cp.location,
                cp.estimated_co2_reduction,
                cp.start_date,
                cp.end_date,
                cp.status,
                c.company_id,
                c.company_name,
                owner.full_name AS company_owner
            FROM verification_notifications vn
            INNER JOIN carbon_projects cp
                ON cp.project_id = vn.project_id
            INNER JOIN companies c
                ON c.company_id = cp.owner_company_id
            INNER JOIN users owner
                ON owner.user_id = c.user_id
            INNER JOIN project_types pt
                ON pt.project_type_id = cp.project_type_id
            WHERE vn.notification_status = 'PENDING'
            ORDER BY vn.created_at ASC
        `);

        return res.json({ success: true, count: notifications.length, data: notifications });
    } catch (error) {
        console.error("Get pending notifications error:", error);
        return res.status(500).json({
            success: false,
            message: error.sqlMessage || error.message || "Failed to retrieve verification notifications"
        });
    }
}

module.exports = {
    createVerification,
    getVerifications,
    getVerificationByProject,
    getPendingNotifications
};
