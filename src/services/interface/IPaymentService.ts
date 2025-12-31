import { RazorpayOrder } from "../../interface/razorpay";

export interface IPaymentService {
  createOrder(amount: number): Promise<RazorpayOrder>;
  verifySignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<boolean>;
}