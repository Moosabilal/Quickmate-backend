import Razorpay from 'razorpay';
import { createHmac } from 'crypto';

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_SECRET as string,
});


export const verifyPaymentSignature = (orderId: string, paymentId: string, signature: string) => {
  const hmac = createHmac('sha256', process.env.RAZORPAY_SECRET as string);
  hmac.update(orderId + '|' + paymentId);
  const generatedSignature = hmac.digest('hex');
  return generatedSignature === signature;
}