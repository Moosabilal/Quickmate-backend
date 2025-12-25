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
        return data
    }

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
                $group: {
                    _id: "$joiningId",
                    lastMessageDoc: { $first: "$$ROOT" }
                }
            },
            {
                $project: {
                    _id: 0,
                    joiningId: "$_id",
                    createdAt: "$lastMessageDoc.createdAt",
                    messageType: "$lastMessageDoc.messageType",
                    lastMessage: "$lastMessageDoc.text", 
                    senderId: "$lastMessageDoc.senderId"
                }
            }
        ]);
        return aggregation;
    }
}

