import { IProviderProfile, ISubscription } from "../../interface/provider.dto";
import { RazorpayOrder } from "../../interface/razorpay.dto";
import { AdminSubscriptionPlanDTO } from "../../interface/subscriptionPlan";
import { ISubscriptionPlan } from "../../models/subscription";

export interface ISubscriptionPlanService {
    createSubscriptionPlan(data: AdminSubscriptionPlanDTO): Promise<void>
    getSubscriptionPlan(): Promise<AdminSubscriptionPlanDTO[]>
    updateSubscriptionPlan(data: AdminSubscriptionPlanDTO): Promise<void>
    deleteSubscriptionPlan(id: string): Promise<void>;
    checkAndExpire(providerId: string): Promise<ISubscription>;
    createSubscriptionOrder(providerId: string, planId: string): Promise<{ order: RazorpayOrder, plan: ISubscriptionPlan }>
    verifySubscriptionPayment(
        providerId: string,
        planId: string,
        razorpay_order_id: string,
        razorpay_payment_id: string,
        razorpay_signature: string): Promise<{ message: string, provider: IProviderProfile }>
}