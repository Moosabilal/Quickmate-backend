import { type RazorpayOrder } from "../../interface/razorpay.js";

export interface IPaymentService {
  createOrder(amount: number): Promise<RazorpayOrder>;
  verifySignature(orderId: string, paymentId: string, signature: string): Promise<boolean>;
}
