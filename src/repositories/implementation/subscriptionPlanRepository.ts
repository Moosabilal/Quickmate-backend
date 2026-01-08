import Subscription, { type ISubscriptionPlan } from "../../models/subscription";
import { type ISubscriptionPlanRepository } from "../interface/ISubscriptionPlanRepository";
import { BaseRepository } from "./base/BaseRepository";

export class SubscriptionPlanRepository
  extends BaseRepository<ISubscriptionPlan>
  implements ISubscriptionPlanRepository
{
  constructor() {
    super(Subscription);
  }
}
