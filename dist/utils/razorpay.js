import Razorpay from "razorpay";
import { createHmac } from "crypto";
export const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
});
export const paymentCreation = async (amount) => {
    return await razorpay.orders.create({
        amount: amount * 100,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
    });
};
export const verifyPaymentSignature = (orderId, paymentId, signature) => {
    const hmac = createHmac("sha256", process.env.RAZORPAY_SECRET);
    hmac.update(orderId + "|" + paymentId);
    const generatedSignature = hmac.digest("hex");
    return generatedSignature === signature;
};
export const initiateRefund = async (paymentId, amount) => {
    const refund = await razorpay.payments.refund(paymentId, {
        amount: amount * 100,
        speed: "normal",
        notes: {
            reason: "Booking Conflict / Slot Unavailable",
        },
    });
    return refund;
};
