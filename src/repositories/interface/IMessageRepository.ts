import { IGetMessages } from "../../dto/booking.dto";
import { IMessage } from "../../models/message";
import { IBaseRepository } from "./base/IBaseRepository";

export interface IMessageRepository extends IBaseRepository<IMessage> {
    findAllSorted(bookingId: string): Promise<IMessage[]>;
}