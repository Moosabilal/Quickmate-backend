"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const type_1 = __importDefault(require("../di/type"));
const container_1 = require("../di/container");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
const chatbotController = container_1.container.get(type_1.default.ChatbotController);
const isProviderUser = [authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRoles)(["ServiceProvider", "Customer"])];
router.post('/session', chatbotController.startSession);
router.get('/session/:sessionId', chatbotController.getHistory);
router.post('/session/:sessionId/message', chatbotController.postMessage);
router.post('/payment/create-order', isProviderUser, chatbotController.createRazorpayOrder);
router.post('/payment/verify', isProviderUser, chatbotController.verifyRazorpayPayment);
exports.default = router;
