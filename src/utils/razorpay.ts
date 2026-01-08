import Razorpay from "razorpay";
import { createHmac } from "crypto";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_SECRET as string,
});

export const paymentCreation = async (amount: number) => {
  return await razorpay.orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
  });
};

export const verifyPaymentSignature = (orderId: string, paymentId: string, signature: string) => {
  const hmac = createHmac("sha256", process.env.RAZORPAY_SECRET as string);
  hmac.update(orderId + "|" + paymentId);
  const generatedSignature = hmac.digest("hex");
  return generatedSignature === signature;
};

export const initiateRefund = async (paymentId: string, amount: number) => {
  const refund = await razorpay.payments.refund(paymentId, {
    amount: amount * 100,
    speed: "normal",
    notes: {
      reason: "Booking Conflict / Slot Unavailable",
    },
  });
  return refund;
};
