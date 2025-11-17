"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessage = void 0;
const mongoose_1 = require("mongoose");
const ChatMessageSchema = new mongoose_1.Schema({
    sessionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'ChatSession',
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'model'],
        required: true
    },
    text: {
        type: String,
        required: false
    },
}, { timestamps: true });
exports.ChatMessage = (0, mongoose_1.model)('ChatMessage', ChatMessageSchema);
