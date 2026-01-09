import { type IOrder } from "../../interface/payment.js";

export const toIInitiateDepositRes = async (order: IOrder) => {
  return {
    success: true,
    orderId: order.id,
    amount: order.amount / 100,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  };
};
