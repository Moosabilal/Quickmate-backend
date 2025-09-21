import { ISubscription } from "../../interface/provider.dto";
import { AdminSubscriptionPlanDTO } from "../../interface/subscriptionPlan";
import { ISubscriptionPlan } from "../../models/subscription";

export interface ISubscriptionPlanService {
    createSubscriptionPlan(data: AdminSubscriptionPlanDTO): Promise<void>
    getSubscriptionPlan(): Promise<AdminSubscriptionPlanDTO[]>
    updateSubscriptionPlan(data: AdminSubscriptionPlanDTO): Promise<void>
    deleteSubscriptionPlan(id: string): Promise<void>;
    subscribe(providerId: string, planId: string): Promise<{message: string, plan: ISubscriptionPlan}>;
    checkAndExpire(providerId: string): Promise<ISubscription>;
}