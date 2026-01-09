import {} from "../../interface/subscriptionPlan.js";
import {} from "../../models/subscription.js";
export const toAdminSubscriptionPlanList = async (plans) => {
    return plans.map((plan) => ({
        ...plan.toObject(),
        id: plan._id.toString(),
    }));
};
