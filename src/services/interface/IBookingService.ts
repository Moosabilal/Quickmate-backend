import { IBookingConfirmationRes, IBookingHistoryPage, IBookingRequest, IGetMessages, IProviderBookingManagement } from "../../dto/booking.dto";
import { IPaymentVerificationRequest } from "../../dto/payment.dto";
import { RazorpayOrder } from "../../dto/razorpay.dto";
import { BookingStatus } from "../../enums/booking.enum";
import { IMessage } from "../../models/message";

export interface IBookingService {
    createNewBooking(data: IBookingRequest ): Promise<{message: string}>;
    createPayment(amount: number, currency: string, receiptId: string): Promise<RazorpayOrder>
    paymentVerification(verifyPayment: IPaymentVerificationRequest): Promise<{message: string, orderId: string, paymentId: string}>;
    findBookingById (id: string): Promise<IBookingConfirmationRes>;
    getAllFilteredBookings(userId: string): Promise<IBookingHistoryPage[]>;
    updateStatus(bookingId: string, status: BookingStatus): Promise<{message: string}>;
    updateBookingDateTime(bookingId: string, date: string, time: string): Promise<void>;

    //provider
    getBookingFor_Prov_mngmnt(providerId: string): Promise<IProviderBookingManagement[]>;
    saveAndEmitMessage(io: any, bookingId: string, senderId: string, text: string)
    getBookingMessages(bookingId: string): Promise<IMessage[]>
}