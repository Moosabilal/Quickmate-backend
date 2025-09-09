import { ResendOtpRequestBody, VerifyOtpRequestBody } from "../../dto/auth.dto";
import { IBookingConfirmationRes, IBookingHistoryPage, IBookingRequest, IGetMessages, IProviderBookingManagement } from "../../dto/booking.dto";
import { IPaymentVerificationRequest } from "../../dto/payment.dto";
import { RazorpayOrder } from "../../dto/razorpay.dto";
import { BookingStatus } from "../../enums/booking.enum";
import { IMessage } from "../../models/message";

export interface IBookingService {
    createNewBooking(data: IBookingRequest): Promise<{ message: string }>;
    createPayment(amount: number): Promise<RazorpayOrder>
    paymentVerification(verifyPayment: IPaymentVerificationRequest): Promise<{ message: string, orderId: string }>;
    findBookingById(id: string): Promise<IBookingConfirmationRes>;
    getAllFilteredBookings(userId: string): Promise<IBookingHistoryPage[]>;
    updateStatus(bookingId: string, status: BookingStatus, userId?: string): Promise<{ message: string, completionToken?: string }>;
    updateBookingDateTime(bookingId: string, date: string, time: string): Promise<void>;

    //provider
    getBookingFor_Prov_mngmnt(userId: string, providerId: string): Promise<IProviderBookingManagement[]>;
    saveAndEmitMessage(io: any, bookingId: string, senderId: string, text: string)
    getBookingMessages(bookingId: string): Promise<IMessage[]>;
    verifyOtp(data: VerifyOtpRequestBody, bookingToken: string): Promise<void>
    resendOtp(data: ResendOtpRequestBody, userId?: string): Promise<{ message: string, newCompletionToken?: string }>

}