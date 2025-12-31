"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("../utils/multer"));
const container_1 = require("../di/container");
const type_1 = __importDefault(require("../di/type"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
const messageController = container_1.container.get(type_1.default.MessageController);
router.post('/upload-file', authMiddleware_1.authenticateToken, multer_1.default.single('chatFile'), messageController.uploadChatFile);
exports.default = router;
