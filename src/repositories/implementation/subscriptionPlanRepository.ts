import Subscription, { type ISubscriptionPlan } from "../../models/subscription.js";
import { type ISubscriptionPlanRepository } from "../interface/ISubscriptionPlanRepository.js";
import { BaseRepository } from "./base/BaseRepository.js";

export class SubscriptionPlanRepository
  extends BaseRepository<ISubscriptionPlan>
  implements ISubscriptionPlanRepository
{
  constructor() {
    super(Subscription);
  }
}
