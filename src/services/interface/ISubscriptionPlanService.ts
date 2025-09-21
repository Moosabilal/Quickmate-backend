import { AdminSubscriptionPlanDTO } from "../../interface/subscriptionPlan";
import { ISubscriptionPlan } from "../../models/subscription";

export interface ISubscriptionPlanService {
    createSubscriptionPlan(data: AdminSubscriptionPlanDTO): Promise<void>
    getSubscriptionPlan(): Promise<AdminSubscriptionPlanDTO[]>
    updateSubscriptionPlan(data: AdminSubscriptionPlanDTO): Promise<void>
    deleteSubscriptionPlan(id: string): Promise<void>
}