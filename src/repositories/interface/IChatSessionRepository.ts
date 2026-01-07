import { type IChatSession } from "../../models/chatSession";
import { type IBaseRepository } from "./base/IBaseRepository";

// export interface IChatSessionRepository extends IBaseRepository<IChatSession> {}
export type IChatSessionRepository = IBaseRepository<IChatSession>;
