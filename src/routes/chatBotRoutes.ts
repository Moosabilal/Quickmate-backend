import express, { Router } from 'express';
import TYPES from '../di/type';
import { container } from '../di/container';
import { ChatbotController } from '../controllers/chatBotController';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();
const chatbotController = container.get<ChatbotController>(TYPES.ChatbotController);
const isProviderUser = [authenticateToken, authorizeRoles(["ServiceProvider", "Customer"])];

router.post('/session', chatbotController.startSession);
router.get('/session/:sessionId', chatbotController.getHistory); 
router.post('/session/:sessionId/message', chatbotController.postMessage);

router.post('/verify-chat-payment/:sessionId', isProviderUser, chatbotController.verifyRazorpayPayment);

export default router;
