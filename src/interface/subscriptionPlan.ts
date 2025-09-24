export interface AdminSubscriptionPlanDTO {
  id?: string;
  name?: string;
  price?: number;
  durationInDays?: number;
  features?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IVerifySubscriptionPaymentReq {
  providerId: string;
  planId: string;
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
}