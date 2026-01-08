import { Schema, model } from "mongoose";
const chatSessionSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String, required: true },
    context: { type: Object, default: {} },
    state: { type: String, default: null },
    selectedAddress: { type: Object, default: null },
}, { timestamps: true });
export const ChatSession = model("ChatSession", chatSessionSchema);
