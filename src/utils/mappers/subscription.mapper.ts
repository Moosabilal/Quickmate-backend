import { ISubscription } from "../../interface/provider"
import { AdminSubscriptionPlanDTO } from "../../interface/subscriptionPlan"
import { IProvider } from "../../models/Providers"
import { ISubscriptionPlan } from "../../models/subscription"


export const toAdminSubscriptionPlanList = async (plans: ISubscriptionPlan[]): Promise<AdminSubscriptionPlanDTO[]> => {
    return plans.map((plan) => ({
        ...plan.toObject(),
        id: plan._id.toString()
    }))
}
