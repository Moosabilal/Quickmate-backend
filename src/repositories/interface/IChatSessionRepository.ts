import { type IChatSession } from "../../models/chatSession.js";
import { type IBaseRepository } from "./base/IBaseRepository.js";

// export interface IChatSessionRepository extends IBaseRepository<IChatSession> {}
export type IChatSessionRepository = IBaseRepository<IChatSession>;
