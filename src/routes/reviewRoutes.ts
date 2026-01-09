import express from "express";
import { type ReviewController } from "../controllers/reviewController.js";
import { container } from "../di/container.js";
import TYPES from "../di/type.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const reviewController = container.get<ReviewController>(TYPES.ReviewController);

const isProvOrUser = [authenticateToken, authorizeRoles(["Customer", "ServiceProvider"])];
const isAdmin = [authenticateToken, authorizeRoles(["Admin"])];

router.post("/addReview", isProvOrUser, reviewController.addReview);
router.get("/reviews", isAdmin, reviewController.getAllReviewsForAdmin);
router.patch("/reviews/:id/status", isAdmin, reviewController.updateReviewStatus);

export default router;
