import express from "express";
import upload from "../utils/multer";
import { container } from "../di/container";
import TYPES from "../di/type";
import { authenticateToken } from "../middleware/authMiddleware";
import { type MessageController } from "../controllers/messageController";

const router = express.Router();
const messageController = container.get<MessageController>(TYPES.MessageController);

router.post("/upload-file", authenticateToken, upload.single("chatFile"), messageController.uploadChatFile);

export default router;
