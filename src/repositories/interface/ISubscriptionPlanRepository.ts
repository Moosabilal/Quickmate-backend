import { type ISubscriptionPlan } from "../../models/subscription";
import { type IBaseRepository } from "./base/IBaseRepository";

// export interface ISubscriptionPlanRepository extends IBaseRepository<ISubscriptionPlan> {}
export type ISubscriptionPlanRepository = IBaseRepository<ISubscriptionPlan>;
