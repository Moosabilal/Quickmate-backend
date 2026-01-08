import mongoose, { Schema, type InferSchemaType, type HydratedDocument } from "mongoose";

const MessageSchema = new Schema(
  {
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
  },
  { timestamps: true },
);

type MessageSchemaType = InferSchemaType<typeof MessageSchema>;
export type IMessage = HydratedDocument<MessageSchemaType>;

export default mongoose.model<IMessage>("Message", MessageSchema);
