import { Router } from "express";
import TYPES from "../di/type.js";
import { container } from "../di/container.js";
import { type ChatbotController } from "../controllers/chatBotController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = Router();
const chatbotController = container.get<ChatbotController>(TYPES.ChatbotController);
const isProviderUser = [authenticateToken, authorizeRoles(["ServiceProvider", "Customer"])];

router.post("/session", chatbotController.startSession);
router.get("/session/:sessionId", chatbotController.getHistory);
router.post("/session/:sessionId/message", chatbotController.postMessage);

router.post("/verify-chat-payment/:sessionId", isProviderUser, chatbotController.verifyRazorpayPayment);

export default router;
