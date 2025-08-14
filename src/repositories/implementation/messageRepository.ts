import mongoose, { FilterQuery } from "mongoose";
import Message, { IMessage } from "../../models/message";
import { BaseRepository } from "./base/BaseRepository";
import { IGetMessages } from "../../dto/booking.dto";
import { IMessageRepository } from "../interface/IMessageRepository";

export class MessageRepository extends BaseRepository<IMessage> implements IMessageRepository  {
 constructor() {
    super(Message)
 }

async findAllSorted(bookingId: string): Promise<IMessage[]> {
        const objectId = new mongoose.Types.ObjectId(bookingId);

        return Message.find({ bookingId: objectId })
            .sort({ createdAt: 1 })
            .lean()
    }
}