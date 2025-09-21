import mongoose, { Schema, Document, InferSchemaType, HydratedDocument } from "mongoose";

const MessageSchema = new Schema({
  joiningId: { type: String},
  // bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: false },
  senderId: { type: String, required: true },
  text: { type: String, required: true },
}, { timestamps: true });

type MessageSchemaType = InferSchemaType<typeof MessageSchema>;
export type IMessage = HydratedDocument<MessageSchemaType>;

export default mongoose.model<IMessage>("Message", MessageSchema);
