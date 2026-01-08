import { BaseRepository } from "./base/BaseRepository";
import { injectable } from "inversify";
import { ChatSession, type IChatSession } from "../../models/chatSession";
import { type IChatSessionRepository } from "../interface/IChatSessionRepository";

@injectable()
export class ChatSessionRepository extends BaseRepository<IChatSession> implements IChatSessionRepository {
  constructor() {
    super(ChatSession);
  }
}
