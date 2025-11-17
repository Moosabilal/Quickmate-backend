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
const reviewController = container_1.container.get(type_1.default.ReviewController);
const isProvOrUser = [authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRoles)(['Customer', 'ServieProvider'])];
const isAdmin = [authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRoles)(['Admin'])];
router.post('/addReview', isProvOrUser, reviewController.addReview);
router.get('/reviews', isAdmin, reviewController.getAllReviewsForAdmin);
router.patch('/reviews/:id/status', isAdmin, reviewController.updateReviewStatus);
exports.default = router;
