import { IBookingConfirmationRes, IBookingHistoryPage, IBookingRequest } from "../../dto/booking.dto";
import { IPaymentVerificationRequest } from "../../dto/payment.dto";
import { RazorpayOrder } from "../../dto/razorpay.dto";

export interface IBookingService {
    createNewBooking(data: IBookingRequest ): Promise<{message: string}>;
    createPayment(amount: number, currency: string, receiptId: string): Promise<RazorpayOrder>
    paymentVerification(verifyPayment: IPaymentVerificationRequest): Promise<{message: string, orderId: string, paymentId: string}>;
    findBookingById (id: string): Promise<IBookingConfirmationRes>;
    getAllFilteredBookings(userId: string): Promise<IBookingHistoryPage[]>;
}