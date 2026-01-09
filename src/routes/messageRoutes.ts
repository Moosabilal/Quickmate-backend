import express from "express";
import upload from "../utils/multer.js";
import { container } from "../di/container.js";
import TYPES from "../di/type.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { type MessageController } from "../controllers/messageController.js";

const router = express.Router();
const messageController = container.get<MessageController>(TYPES.MessageController);

router.post("/upload-file", authenticateToken, upload.single("chatFile"), messageController.uploadChatFile);

export default router;
