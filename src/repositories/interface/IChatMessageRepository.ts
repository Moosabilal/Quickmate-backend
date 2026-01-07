import { type IChatMessage } from "../../models/chatMessage";
import { type IBaseRepository } from "./base/IBaseRepository";

// export interface IChatMessageRepository extends IBaseRepository<IChatMessage> {}
export type IChatMessageRepository = IBaseRepository<IChatMessage>;
