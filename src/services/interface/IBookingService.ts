import { IBookingConfirmationRes, IBookingHistoryPage, IBookingRequest, IGetMessages, IProviderBookingManagement } from "../../dto/booking.dto";
import { IPaymentVerificationRequest } from "../../dto/payment.dto";
import { RazorpayOrder } from "../../dto/razorpay.dto";
import { IMessage } from "../../models/message";

export interface IBookingService {
    createNewBooking(data: IBookingRequest ): Promise<{message: string}>;
    createPayment(amount: number, currency: string, receiptId: string): Promise<RazorpayOrder>
    paymentVerification(verifyPayment: IPaymentVerificationRequest): Promise<{message: string, orderId: string, paymentId: string}>;
    findBookingById (id: string): Promise<IBookingConfirmationRes>;
    getAllFilteredBookings(userId: string): Promise<IBookingHistoryPage[]>;

    //provider
    getBookingFor_Prov_mngmnt(providerId: string): Promise<IProviderBookingManagement[]>;
    saveAndEmitMessage(io: any, bookingId: string, senderId: string, text: string)
    getBookingMessages(bookingId: string): Promise<IMessage[]>
}