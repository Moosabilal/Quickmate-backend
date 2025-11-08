import { BaseRepository } from "./base/BaseRepository";
import { injectable } from "inversify";
import { ChatSession, IChatSession } from "../../models/chatSession";
import { IChatSessionRepository } from "../interface/IChatSessionRepository";



@injectable()
export class ChatSessionRepository extends BaseRepository<IChatSession> implements IChatSessionRepository {

    constructor() {
        super(ChatSession)
    }

}