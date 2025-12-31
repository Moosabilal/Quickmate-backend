import { ChatMessage, IChatMessage } from "../../models/chatMessage";
import { IChatMessageRepository } from "../interface/IChatMessageRepository";
import { BaseRepository } from "./base/BaseRepository";
import { injectable } from "inversify";



@injectable()
export class ChatMessageRepository extends BaseRepository<IChatMessage> implements IChatMessageRepository {

    constructor() {
        super(ChatMessage)
    }

}