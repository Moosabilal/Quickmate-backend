import { type ISubscriptionPlan } from "../models/subscription";
import { type RazorpayOrder } from "./razorpay";

export interface AdminSubscriptionPlanDTO {
  id?: string;
  name?: string;
  price?: number;
  description?: string;
  durationInDays?: number;
  features?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IVerifySubscriptionPaymentReq {
  providerId: string;
  planId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface IUpgradeCostResponse {
  order: RazorpayOrder;
  newPlan: ISubscriptionPlan;
  oldPlanValue: number;
  newPlanPrice: number;
  finalAmount: number;
}
