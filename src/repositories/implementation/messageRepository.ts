import mongoose, { FilterQuery } from "mongoose";
import Message, { IMessage } from "../../models/message";
import { BaseRepository } from "./base/BaseRepository";
import { IMessageRepository } from "../interface/IMessageRepository";

export class MessageRepository extends BaseRepository<IMessage> implements IMessageRepository {
    constructor() {
        super(Message)
    }

    async findAllSorted(joiningId: string): Promise<IMessage[]> {
        const data = Message.find({ joiningId })
            .sort({ createdAt: 1 })
            .lean()
        return data
    }

    // src/repositories/implementation/MessageRepository.ts

    public async findLastMessagesByJoiningIds(
        joiningIds: string[]
    ): Promise<{
        joiningId: string;
        lastMessage: string | null;
        messageType: 'text' | 'image' | 'file';
        senderId: string;
        createdAt: Date;
    }[]> {

        const aggregation = await this.model.aggregate([
            { $match: { joiningId: { $in: joiningIds } } },
            { $sort: { createdAt: -1 } },
            {
                // 1. Get the entire document of the most recent message
                $group: {
                    _id: "$joiningId",
                    lastMessageDoc: { $first: "$$ROOT" }
                }
            },
            {
                // 2. Project the fields we need
                $project: {
                    _id: 0,
                    joiningId: "$_id",
                    createdAt: "$lastMessageDoc.createdAt",
                    messageType: "$lastMessageDoc.messageType",
                    lastMessage: "$lastMessageDoc.text", // This will be the text or null
                    senderId: "$lastMessageDoc.senderId"
                }
            }
        ]);
        return aggregation;
    }
}

