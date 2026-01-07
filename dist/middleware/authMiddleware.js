import jwt from "jsonwebtoken";
import logger from "../logger/logger";
export const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        res.status(401).json({ message: "Access token not found" });
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        logger.error("Token verification failed:", error);
        res.status(401).json({ message: "Access token invalid or expired" });
        return;
    }
};
export const authorizeRoles = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ message: "User not authenticated for role check." });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ message: "Access denied: Insufficient privileges." });
            return;
        }
        next();
    };
};
