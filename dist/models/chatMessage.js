import { Schema, model } from "mongoose";
const ChatMessageSchema = new Schema({
    sessionId: {
        type: Schema.Types.ObjectId,
        ref: "ChatSession",
        required: true,
    },
    role: {
        type: String,
        enum: ["user", "model"],
        required: true,
    },
    text: {
        type: String,
        required: false,
    },
}, { timestamps: true });
export const ChatMessage = model("ChatMessage", ChatMessageSchema);
