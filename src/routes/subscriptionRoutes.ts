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
const isAdminOrUser = [authenticateToken, authorizeRoles(["Admin", "ServiceProvider"])]
const isProvider = [authenticateToken, authorizeRoles(["ServiceProvider"])]

router.post('/createSubscriptionPlan',isAdmin, subscriptionController.createSubscriptionPlan)
router.get('/getSubscriptionPlan',isAdminOrUser, subscriptionController.getSubscriptionPlan)
router.put('/updateSubscriptionPlan',isAdmin, subscriptionController.updateSubscriptionPlan)
router.delete('/deleteSubscriptionPlan/:id',isAdmin, subscriptionController.deleteSubscriptionPlan)
router.get("/:providerId/check", isProvider, subscriptionController.checkProviderSubscription);
router.post("/create-order", isProvider, subscriptionController.createSubscriptionOrder);
router.post("/verify-payment", isProvider, subscriptionController.verifySubscriptionPayment);
router.post("/calculate-upgrade", isProvider, subscriptionController.calculateUpgrade);


export default router