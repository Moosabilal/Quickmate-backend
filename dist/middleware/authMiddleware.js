"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        res.status(401).json({ message: 'Access token not found' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        console.log('the token verification failed');
        res.status(401).json({ message: 'Access token invalid or expired' });
        return;
    }
};
exports.authenticateToken = authenticateToken;
const authorizeRoles = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ message: 'User not authenticated for role check.' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ message: 'Access denied: Insufficient privileges.' });
            return;
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
