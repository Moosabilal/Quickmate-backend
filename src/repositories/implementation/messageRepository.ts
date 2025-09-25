import mongoose, { FilterQuery } from "mongoose";
import Message, { IMessage } from "../../models/message";
import { BaseRepository } from "./base/BaseRepository";
import { IGetMessages } from "../../interface/booking.dto";
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

    async findLastMessagesByBookingIds(bookingIds: string[]): Promise<{ bookingId: string; lastMessage: string; createdAt: Date }[]> {
        const objectIds = bookingIds.map(id => new mongoose.Types.ObjectId(id));

        const results = await Message.aggregate([
            { $match: { bookingId: { $in: objectIds } } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$bookingId",
                    lastMessage: { $first: "$text" },
                    createdAt: { $first: "$createdAt" }
                }
            }
        ]);

        return results.map(result => ({
            bookingId: result._id.toString(),
            lastMessage: result.lastMessage,
            createdAt: result.createdAt
        }));
    }
}

