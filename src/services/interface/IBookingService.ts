import { IBookingRequest } from "../../dto/booking.dto";
import { RazorpayOrder } from "../../dto/razorpay.dto";

export interface IBookingService {
    createNewBooking(data: IBookingRequest ): Promise<{message: string}>;
    createPayment(amount: number, currency: string, receiptId: string): Promise<RazorpayOrder>
    paymentVerification(razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string): Promise<{message: string, orderId: string, paymentId: string}>;
}