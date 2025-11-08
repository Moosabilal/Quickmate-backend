import { Schema, model, Types, HydratedDocument, InferSchemaType } from 'mongoose';

const ChatMessageSchema = new Schema({
    sessionId: {
        type: Schema.Types.ObjectId,
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

type ChatMessageSchemaType = InferSchemaType<typeof ChatMessageSchema>;
export interface IChatMessage extends HydratedDocument<ChatMessageSchemaType> {}
export const ChatMessage = model<IChatMessage>('ChatMessage', ChatMessageSchema);