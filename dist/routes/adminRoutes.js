"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const container_1 = require("../di/container");
const type_1 = __importDefault(require("../di/type"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
const adminController = container_1.container.get(type_1.default.AdminController);
const isAdmin = [authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRoles)(['Admin'])];
router.get('/getAdminDashboard', adminController.getAdminDashboard);
router.get('/analytics/dashboard', isAdmin, adminController.getDashboardAnalytics);
router.put('/change-password', isAdmin, adminController.changePassword);
exports.default = router;
