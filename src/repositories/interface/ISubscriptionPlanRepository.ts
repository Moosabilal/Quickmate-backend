import { type ISubscriptionPlan } from "../../models/subscription.js";
import { type IBaseRepository } from "./base/IBaseRepository.js";

// export interface ISubscriptionPlanRepository extends IBaseRepository<ISubscriptionPlan> {}
export type ISubscriptionPlanRepository = IBaseRepository<ISubscriptionPlan>;
