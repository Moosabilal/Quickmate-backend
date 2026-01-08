import mongoose, { Schema } from "mongoose";
const MessageSchema = new Schema({
    joiningId: {
        type: String,
        required: true,
        index: true,
    },
    senderId: {
        type: String,
        required: true,
    },
    messageType: {
        type: String,
        enum: ["text", "image", "file"],
        default: "text",
    },
    text: {
        type: String,
        required: false,
    },
    fileUrl: {
        type: String,
        required: false,
    },
}, { timestamps: true });
export default mongoose.model("Message", MessageSchema);
