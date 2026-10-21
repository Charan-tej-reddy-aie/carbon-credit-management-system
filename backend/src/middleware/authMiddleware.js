const jwt = require("jsonwebtoken");

/* =========================================================
   AUTHENTICATE TOKEN
   ========================================================= */

function authenticateToken(req, res, next) {
    try {
        const authHeader =
            req.headers.authorization;

        // Check whether Authorization header exists
        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Authentication token is required"
            });
        }

        // Extract token
        const token =
            authHeader.substring(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message:
                    "Authentication token is required"
            });
        }

        // Verify JWT
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Make sure the decoded token contains user ID
        if (
            !decoded ||
            !decoded.user_id
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid authentication token"
            });
        }

        // Attach logged-in user to request
        req.user = decoded;

        next();

    } catch (error) {
        console.error(
            "Authentication error:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message:
                "Invalid or expired authentication token"
        });
    }
}


/* =========================================================
   AUTHORIZE ROLES
   ========================================================= */

function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {

        if (
            !req.user ||
            !req.user.user_id
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Authentication required"
            });
        }

        if (
            !req.user.role ||
            !allowedRoles.includes(
                req.user.role
            )
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to perform this action"
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