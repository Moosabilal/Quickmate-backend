import { BaseRepository } from "./base/BaseRepository.js";
import { injectable } from "inversify";
import { ChatSession, type IChatSession } from "../../models/chatSession.js";
import { type IChatSessionRepository } from "../interface/IChatSessionRepository.js";

@injectable()
export class ChatSessionRepository extends BaseRepository<IChatSession> implements IChatSessionRepository {
  constructor() {
    super(ChatSession);
  }
}
