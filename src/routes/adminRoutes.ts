import express from "express";
import { container } from "../di/container.js";
import TYPES from "../di/type.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { type AdminController } from "../controllers/adminController.js";

const router = express.Router();
const adminController = container.get<AdminController>(TYPES.AdminController);

const isAdmin = [authenticateToken, authorizeRoles(["Admin"])];

router.get("/getAdminDashboard", adminController.getAdminDashboard);
router.get("/analytics/dashboard", isAdmin, adminController.getDashboardAnalytics);
router.put("/change-password", isAdmin, adminController.changePassword);

export default router;
