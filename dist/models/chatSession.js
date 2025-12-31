"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatSession = void 0;
const mongoose_1 = require("mongoose");
const chatSessionSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String, required: true },
    context: { type: Object, default: {} },
    state: { type: String, default: null },
    selectedAddress: { type: Object, default: null },
}, { timestamps: true });
exports.ChatSession = (0, mongoose_1.model)("ChatSession", chatSessionSchema);
