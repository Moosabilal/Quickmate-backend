import express from 'express'
import { ReviewController } from '../controllers/reviewController'
import { container } from '../di/container'
import TYPES from '../di/type'
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware'

const router = express.Router()
const reviewController = container.get<ReviewController>(TYPES.ReviewController)

const isProvOrUser = [authenticateToken, authorizeRoles(['Customer','ServieProvider'])]
const isAdmin = [authenticateToken, authorizeRoles(['Admin'])]

router.post('/addReview', isProvOrUser, reviewController.addReview)
router.get('/reviews', isAdmin, reviewController.getAllReviewsForAdmin);
router.patch('/reviews/:id/status', isAdmin, reviewController.updateReviewStatus);


export default router