import { ResendOtpRequestBody, VerifyOtpRequestBody } from "../../interface/auth";
import { IAdminBookingsResponse, IBookingConfirmationRes, IBookingHistoryPage, IBookingRequest, IGetMessages, IProviderBookingManagement } from "../../interface/booking";
import { IPaymentVerificationPayload, IPaymentVerificationRequest } from "../../interface/payment";
import { RazorpayOrder } from "../../interface/razorpay";
import { BookingStatus } from "../../enums/booking.enum";
import { IMessage } from "../../models/message";
import { Roles } from "../../enums/userRoles";

export interface IBookingService {
    createNewBooking(data: IBookingRequest): Promise<{ message: string }>;
    createPayment(amount: number): Promise<RazorpayOrder>
    paymentVerification(verifyPayment: IPaymentVerificationRequest): Promise<{ message: string, orderId: string }>;
    findBookingById(id: string): Promise<IBookingConfirmationRes>;
    getAllFilteredBookings(userId: string): Promise<IBookingHistoryPage[]>;
    updateStatus(bookingId: string, status: BookingStatus, userId?: string): Promise<{ message: string, completionToken?: string }>;
    updateBookingDateTime(bookingId: string, date: string, time: string): Promise<void>;

    //provider
    getBookingFor_Prov_mngmnt(userId: string, providerId: string, search: string): Promise<{ earnings: number, bookings: IProviderBookingManagement[] }>;
    saveAndEmitMessage(io: any, joiningId: string, senderId: string, text: string)
    getBookingMessages(joiningId: string): Promise<IMessage[]>;
    verifyOtp(data: VerifyOtpRequestBody, bookingToken: string): Promise<void>
    resendOtp(data: ResendOtpRequestBody, userId?: string): Promise<{ message: string, newCompletionToken?: string }>;
    getAllBookingsForAdmin(
        page: number,
        limit: number,
        filters: { search?: string; bookingStatus?: string; }
    ): Promise<IAdminBookingsResponse>;
    findProviderRange(userId: string, userRole: Roles, serviceId: string, lat: number, lng: number, radius: number): Promise<boolean>;

}