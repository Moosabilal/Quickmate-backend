import mongoose, { Schema, Document, InferSchemaType, HydratedDocument } from "mongoose";

const MessageSchema = new Schema({
  joiningId: { 
    type: String,
    required: true,
    index: true  
  },
  senderId: { 
    type: String, 
    required: true 
  },
  
  messageType: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  text: { 
    type: String, 
    required: function(this: any) { return this.messageType === 'text'; } 
  },
  fileUrl: {
    type: String,
    required: function(this: any) { return this.messageType !== 'text'; }
  }

}, { timestamps: true });

type MessageSchemaType = InferSchemaType<typeof MessageSchema>;
export type IMessage = HydratedDocument<MessageSchemaType>;

export default mongoose.model<IMessage>("Message", MessageSchema);