import { IGetMessages } from "../../interface/booking.dto";
import { IMessage } from "../../models/message";
import { IBaseRepository } from "./base/IBaseRepository";

export interface IMessageRepository extends IBaseRepository<IMessage> {
    findAllSorted(joiningId: string): Promise<IMessage[]>;
    findLastMessagesByBookingIds(bookingIds: string[]): Promise<{ bookingId: string; lastMessage: string; createdAt: Date }[]>;
}