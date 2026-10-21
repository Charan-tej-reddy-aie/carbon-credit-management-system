const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

async function register(req, res) {
    let connection;

    try {
        const {
            full_name,
            email,
            password,
            company_name,
            wallet_address,
            country
        } = req.body;

        if (!full_name?.trim() || !email?.trim() || !password || !company_name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Full name, email, password and company name are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [existingUsers] = await connection.execute(
            `SELECT user_id FROM users WHERE email = ? LIMIT 1`,
            [normalizedEmail]
        );

        if (existingUsers.length > 0) {
            await connection.rollback();
            return res.status(409).json({ success: false, message: "Email is already registered" });
        }

        const [roles] = await connection.execute(
            `SELECT role_id FROM roles WHERE role_name = 'COMPANY' LIMIT 1`
        );

        if (roles.length === 0) {
            await connection.rollback();
            return res.status(500).json({ success: false, message: "COMPANY role is not configured" });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const [userResult] = await connection.execute(
            `
            INSERT INTO users
            (full_name, email, password_hash, role_id, wallet_address, country, account_status)
            VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
            `,
            [
                full_name.trim(),
                normalizedEmail,
                passwordHash,
                roles[0].role_id,
                wallet_address?.trim() || null,
                country?.trim() || null
            ]
        );

        const [companyResult] = await connection.execute(
            `INSERT INTO companies (user_id, company_name) VALUES (?, ?)`,
            [userResult.insertId, company_name.trim()]
        );

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: "Company account registered successfully",
            data: {
                user_id: userResult.insertId,
                company_id: companyResult.insertId,
                full_name: full_name.trim(),
                email: normalizedEmail,
                role: "COMPANY",
                company_name: company_name.trim()
            }
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (_) {
                // Ignore rollback errors.
            }
        }

        console.error("Registration error:", error);
        return res.status(500).json({
            success: false,
            message: error.code === "ER_DUP_ENTRY" ? "Email or company name is already registered" : "Registration failed"
        });
    } finally {
        connection?.release();
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email?.trim() || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ success: false, message: "JWT configuration is missing" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const [users] = await pool.execute(
            `
            SELECT
                u.user_id,
                u.full_name,
                u.email,
                u.password_hash,
                u.wallet_address,
                u.country,
                u.account_status,
                r.role_id,
                r.role_name,
                c.company_id,
                c.company_name
            FROM users u
            INNER JOIN roles r ON r.role_id = u.role_id
            LEFT JOIN companies c ON c.user_id = u.user_id
            WHERE LOWER(TRIM(u.email)) = ?
            LIMIT 1
            `,
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const user = users[0];

        if (user.account_status !== "ACTIVE") {
            return res.status(403).json({
                success: false,
                message: `Account is ${user.account_status.toLowerCase()}`
            });
        }

        const passwordMatch = await bcrypt.compare(String(password), String(user.password_hash));
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const token = jwt.sign(
            {
                user_id: user.user_id,
                role_id: user.role_id,
                role: user.role_name,
                email: user.email,
                company_id: user.company_id || null
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                user_id: user.user_id,
                full_name: user.full_name,
                email: user.email,
                role_id: user.role_id,
                role: user.role_name,
                company_id: user.company_id || null,
                company_name: user.company_name || null,
                wallet_address: user.wallet_address || null,
                country: user.country || null,
                account_status: user.account_status
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            success: false,
            message: "Login failed"
        });
    }
}

module.exports = { register, login };
