import { ChatMessage, type IChatMessage } from "../../models/chatMessage.js";
import { type IChatMessageRepository } from "../interface/IChatMessageRepository.js";
import { BaseRepository } from "./base/BaseRepository.js";
import { injectable } from "inversify";

@injectable()
export class ChatMessageRepository extends BaseRepository<IChatMessage> implements IChatMessageRepository {
  constructor() {
    super(ChatMessage);
  }
}
