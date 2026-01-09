import Message, {} from "../../models/message.js";
import { BaseRepository } from "./base/BaseRepository.js";
import {} from "../interface/IMessageRepository.js";
export class MessageRepository extends BaseRepository {
    constructor() {
        super(Message);
    }
    async findAllSorted(joiningId) {
        const data = Message.find({ joiningId }).sort({ createdAt: 1 });
        return data;
    }
    async findLastMessagesByJoiningIds(joiningIds) {
        const aggregation = await this.model.aggregate([
            { $match: { joiningId: { $in: joiningIds } } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$joiningId",
                    lastMessageDoc: { $first: "$$ROOT" },
                },
            },
            {
                $project: {
                    _id: 0,
                    joiningId: "$_id",
                    createdAt: "$lastMessageDoc.createdAt",
                    messageType: "$lastMessageDoc.messageType",
                    lastMessage: "$lastMessageDoc.text",
                    senderId: "$lastMessageDoc.senderId",
                },
            },
        ]);
        return aggregation;
    }
}
