const { pool } = require("../config/database");

async function getWallet(req, res) {
    try {
        const userId = req.user.user_id;

        const [rows] = await pool.execute(
            `
            SELECT
                u.user_id,
                u.full_name,
                u.email,
                u.wallet_address,
                c.company_id,
                c.company_name
            FROM users u
            LEFT JOIN companies c ON c.user_id = u.user_id
            WHERE u.user_id = ?
            LIMIT 1
            `,
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error("Get wallet error:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve wallet information" });
    }
}

async function updateWallet(req, res) {
    try {
        const userId = req.user.user_id;
        const walletAddress = String(req.body.wallet_address || "").trim();

        if (!walletAddress) {
            return res.status(400).json({ success: false, message: "Wallet address is required" });
        }

        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid EVM wallet address (0x followed by 40 hexadecimal characters)"
            });
        }

        const [existing] = await pool.execute(
            `SELECT user_id FROM users WHERE wallet_address = ? AND user_id <> ? LIMIT 1`,
            [walletAddress, userId]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This wallet address is already linked to another account"
            });
        }

        await pool.execute(
            `UPDATE users SET wallet_address = ? WHERE user_id = ?`,
            [walletAddress, userId]
        );

        return res.json({
            success: true,
            message: "Wallet address saved successfully",
            data: { wallet_address: walletAddress }
        });
    } catch (error) {
        console.error("Update wallet error:", error);
        return res.status(500).json({
            success: false,
            message: error.code === "ER_DUP_ENTRY"
                ? "This wallet address is already linked to another account"
                : "Failed to save wallet address"
        });
    }
}

module.exports = { getWallet, updateWallet };
