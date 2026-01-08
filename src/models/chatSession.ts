import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const chatSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String, required: true },
    context: { type: Object, default: {} },
    state: { type: String, default: null },
    selectedAddress: { type: Object, default: null },
  },
  { timestamps: true },
);

type ChatSessionSchemaType = InferSchemaType<typeof chatSessionSchema>;
export type IChatSession = HydratedDocument<ChatSessionSchemaType>;

export const ChatSession = model<IChatSession>("ChatSession", chatSessionSchema);
