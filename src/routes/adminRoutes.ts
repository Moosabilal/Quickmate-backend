import express from "express";
import { container } from "../di/container.js";
import TYPES from "../di/type.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { type AdminController } from "../controllers/adminController.js";
import { type AdminReportController } from "../controllers/admin/AdminReportController.js";

const router = express.Router();
const adminController = container.get<AdminController>(TYPES.AdminController);
const adminReportController = container.get<AdminReportController>(TYPES.AdminReportController);

const isAdmin = [authenticateToken, authorizeRoles(["Admin"])];

router.get("/getAdminDashboard", adminController.getAdminDashboard);
router.get("/analytics/dashboard", isAdmin, adminController.getDashboardAnalytics);
router.put("/change-password", isAdmin, adminController.changePassword);

router.post("/reports/:reportId/refund", isAdmin, adminReportController.refundUser);
router.post("/reports/:reportId/assign-rework", isAdmin, adminReportController.assignRework);

export default router;
