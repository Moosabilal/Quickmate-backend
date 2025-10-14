import express from 'express';
import { container } from '../di/container';
import TYPES from '../di/type';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';
import { AdminController } from '../controllers/adminController';

const router = express.Router();
const adminController = container.get<AdminController>(TYPES.AdminController)

const isAdmin = [authenticateToken, authorizeRoles(['Admin'])];

router.get('/getAdminDashboard', adminController.getAdminDashboard)
router.get('/analytics/dashboard', isAdmin, adminController.getDashboardAnalytics);



export default router;


