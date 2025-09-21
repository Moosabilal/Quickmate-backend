import express from 'express'
import upload from '../utils/multer'
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware'
import { container } from '../di/container'
import { ServiceController } from '../controllers/serviceController'
import TYPES from '../di/type'
import { SubscriptionPlanController } from '../controllers/subscriptionPlanController'

const router = express.Router()
const subscriptionController = container.get<SubscriptionPlanController>(TYPES.SubscriptionPlanController)
const isAdmin = [authenticateToken, authorizeRoles(["Admin"])]

router.post('/createSubscriptionPlan',isAdmin, subscriptionController.createSubscriptionPlan)
router.get('/getSubscriptionPlan',isAdmin, subscriptionController.getSubscriptionPlan)
router.put('/updateSubscriptionPlan',isAdmin, subscriptionController.updateSubscriptionPlan)
router.delete('/deleteSubscriptionPlan/:id',isAdmin, subscriptionController.deleteSubscriptionPlan)


export default router