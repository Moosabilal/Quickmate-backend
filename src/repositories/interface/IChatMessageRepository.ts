import { type IChatMessage } from "../../models/chatMessage.js";
import { type IBaseRepository } from "./base/IBaseRepository.js";

// export interface IChatMessageRepository extends IBaseRepository<IChatMessage> {}
export type IChatMessageRepository = IBaseRepository<IChatMessage>;
