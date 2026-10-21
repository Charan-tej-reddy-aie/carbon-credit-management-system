const jwt = require("jsonwebtoken");

const ROLE_ID_MAP = {
    1: "ADMIN",
    2: "COMPANY",
    3: "VERIFIER"
};

function normalizeRole(role, roleId) {
    let r = String(role || "").trim().toUpperCase();
    if (!r && roleId) {
        r = ROLE_ID_MAP[Number(roleId)] || "";
    }
    // Backward compatibility for legacy tokens that may contain BUYER or SELLER
    if (r === "BUYER" || r === "SELLER") {
        return "COMPANY";
    }
    return r;
}

/* =========================================================
   AUTHENTICATE TOKEN
   ========================================================= */

function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        // Check whether Authorization header exists
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is required"
            });
        }

        // Extract token
        const token = authHeader.substring(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is required"
            });
        }

        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Make sure the decoded token contains user ID
        if (!decoded || !decoded.user_id) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token"
            });
        }

        // Attach logged-in user to request and normalize role
        req.user = decoded;
        req.user.role = normalizeRole(req.user.role, req.user.role_id);

        next();

    } catch (error) {
        console.error("Authentication error:", error.message);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token"
        });
    }
}


/* =========================================================
   AUTHORIZE ROLES
   ========================================================= */

function authorizeRoles(...allowedRoles) {
    const normalizedAllowed = allowedRoles.map(r => {
        const str = String(r).trim().toUpperCase();
        return (str === "BUYER" || str === "SELLER") ? "COMPANY" : str;
    });

    return (req, res, next) => {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const userRole = normalizeRole(req.user.role, req.user.role_id);
        req.user.role = userRole;

        if (!userRole || !normalizedAllowed.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to perform this action"
            });
        }

        next();
    };
}


/* =========================================================
   EXPORT
   ========================================================= */

module.exports = {
    authenticateToken,
    authorizeRoles
};