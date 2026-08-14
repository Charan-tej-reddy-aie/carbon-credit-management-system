const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

async function register(req, res) {
    try {
        const {
            full_name,
            email,
            password,
            role,
            company_name,
            wallet_address,
            country
        } = req.body;

        if (!full_name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Full name, email, password and role are required"
            });
        }

        const allowedRoles = ["SELLER", "BUYER","VERIFIER"];

        if (!allowedRoles.includes(role.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: "Invalid role"
            });
        }

        const [existingUsers] = await pool.execute(
            "SELECT user_id FROM users WHERE email = ?",
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered"
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const [result] = await pool.execute(
            `INSERT INTO users
            (
                full_name,
                email,
                password_hash,
                role,
                company_name,
                wallet_address,
                country,
                account_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
            [
                full_name,
                email,
                passwordHash,
                role.toUpperCase(),
                company_name || null,
                wallet_address || null,
                country || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user_id: result.insertId,
                full_name,
                email,
                role: role.toUpperCase()
            }
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Registration failed"
        });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const [users] = await pool.execute(
            `SELECT
                user_id,
                full_name,
                email,
                password_hash,
                role,
                company_name,
                wallet_address,
                country,
                account_status
             FROM users
             WHERE email = ?`,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = users[0];

        if (user.account_status !== "ACTIVE") {
            return res.status(403).json({
                success: false,
                message: "Account is not active"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                user_id: user.user_id,
                role: user.role,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                user_id: user.user_id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                company_name: user.company_name,
                wallet_address: user.wallet_address,
                country: user.country
            }
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Login failed"
        });
    }
}

module.exports = {
    register,
    login
};