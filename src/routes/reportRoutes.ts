import express from "express";
import { container } from "../di/container.js";
import TYPES from "../di/type.js";
import { type ReportController } from "../controllers/reportController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const reportController = container.get<ReportController>(TYPES.ReportController);
const isUser = [authenticateToken, authorizeRoles(["Customer", "ServiceProvider"])];
const isAdmin = [authenticateToken, authorizeRoles(["Admin"])];

router.post("/", isUser, reportController.createReport);
router.get("/", isUser, reportController.getReportsForUser);
router.get("/admin", isAdmin, reportController.getReportsForAdmin);
router.patch("/admin/:id/status", isAdmin, reportController.updateReportStatus);
router.post("/:id/schedule-rework", isUser, reportController.scheduleUserRework);

export default router;
