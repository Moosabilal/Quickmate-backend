import { type IProviderProfile, type ISubscription } from "../../interface/provider.js";
import { type RazorpayOrder } from "../../interface/razorpay.js";
import { type AdminSubscriptionPlanDTO, type IUpgradeCostResponse } from "../../interface/subscriptionPlan.js";
import { type ISubscriptionPlan } from "../../models/subscription.js";

export interface ISubscriptionPlanService {
  createSubscriptionPlan(data: AdminSubscriptionPlanDTO): Promise<void>;
  getSubscriptionPlan(search?: string): Promise<AdminSubscriptionPlanDTO[]>;
  updateSubscriptionPlan(data: AdminSubscriptionPlanDTO): Promise<void>;
  deleteSubscriptionPlan(id: string): Promise<void>;
  checkAndExpire(providerId: string): Promise<ISubscription>;
  createSubscriptionOrder(
    providerId: string,
    planId: string,
  ): Promise<{ order: RazorpayOrder; plan: ISubscriptionPlan }>;
  calculateUpgradeCost(userId: string, newPlanId: string): Promise<IUpgradeCostResponse>;
  verifySubscriptionPayment(
    providerId: string,
    planId: string,
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string,
  ): Promise<{ message: string; provider: IProviderProfile }>;
  scheduleDowngrade(userId: string, newPlanId: string): Promise<ISubscription>;
  cancelDowngrade(userId: string): Promise<ISubscription>;
}
