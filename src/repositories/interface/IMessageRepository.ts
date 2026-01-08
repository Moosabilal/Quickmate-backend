import { type IMessage } from "../../models/message";
import { type IBaseRepository } from "./base/IBaseRepository";

export interface IMessageRepository extends IBaseRepository<IMessage> {
  findAllSorted(joiningId: string): Promise<IMessage[]>;
  findLastMessagesByJoiningIds(joiningIds: string[]): Promise<
    {
      joiningId: string;
      lastMessage: string | null;
      messageType: "text" | "image" | "file";
      senderId: string;
      createdAt: Date;
    }[]
  >;
}
