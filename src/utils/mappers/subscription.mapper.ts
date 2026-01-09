import { type AdminSubscriptionPlanDTO } from "../../interface/subscriptionPlan.js";
import { type ISubscriptionPlan } from "../../models/subscription.js";

export const toAdminSubscriptionPlanList = async (plans: ISubscriptionPlan[]): Promise<AdminSubscriptionPlanDTO[]> => {
  return plans.map((plan) => ({
    ...plan.toObject(),
    id: plan._id.toString(),
  }));
};
