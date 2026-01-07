import { ChatMessage, type IChatMessage } from "../../models/chatMessage";
import { type IChatMessageRepository } from "../interface/IChatMessageRepository";
import { BaseRepository } from "./base/BaseRepository";
import { injectable } from "inversify";

@injectable()
export class ChatMessageRepository extends BaseRepository<IChatMessage> implements IChatMessageRepository {
  constructor() {
    super(ChatMessage);
  }
}
