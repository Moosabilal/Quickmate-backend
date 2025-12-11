import { ResendOtpRequestBody, VerifyOtpRequestBody } from "../../interface/auth";
import { IAdminBookingsResponse, IBookingConfirmationRes, IBookingDetailData, IBookingHistoryPage, IBookingRequest, IGetMessages, IProviderBookingManagement, IUserBookingsResponse } from "../../interface/booking";
import { IPaymentVerificationPayload, IPaymentVerificationRequest } from "../../interface/payment";
import { RazorpayOrder } from "../../interface/razorpay";
import { BookingStatus } from "../../enums/booking.enum";
import { IMessage } from "../../models/message";
import { Roles } from "../../enums/userRoles";
import { ISocketMessage } from "../../interface/message";
import { IBooking } from "../../models/Booking";
import { Server } from "socket.io";

export interface IBookingService {
    createNewBooking(data: IBookingRequest): Promise<{ message: string }>;
    createPayment(amount: number): Promise<RazorpayOrder>
    paymentVerification(verifyPayment: IPaymentVerificationRequest): Promise<{ message: string, orderId: string }>;
    findBookingById(id: string): Promise<IBookingConfirmationRes>;
    getAllFilteredBookings(userId: string, filters: { search?: string, status?: BookingStatus }): Promise<IUserBookingsResponse>; 
    updateStatus(bookingId: string, status: BookingStatus, userId?: string): Promise<{ message: string, completionToken?: string }>;
    updateBookingDateTime(bookingId: string, date: string, time: string): Promise<void>;

    //provider
    getBookingFor_Prov_mngmnt(providerId: string, search?: string, status?: BookingStatus): Promise<{ earnings: number, bookings: IProviderBookingManagement[] }>;
    saveAndEmitMessage(io: Server, messageData: ISocketMessage): Promise<IMessage>;
    getBookingMessages(joiningId: string): Promise<IMessage[]>;
    verifyOtp(data: VerifyOtpRequestBody, bookingToken: string): Promise<void>
    resendOtp(data: ResendOtpRequestBody, userId?: string): Promise<{ message: string, newCompletionToken?: string }>;
    getAllBookingsForAdmin(
        page: number,
        limit: number,
        filters: { search?: string; bookingStatus?: string; dateRange?: string }
    ): Promise<IAdminBookingsResponse>;
    findProviderRange(userId: string, userRole: Roles, serviceId: string, lat: number, lng: number, radius: number): Promise<boolean>;
    createBookingFromBot(data: IBookingRequest): Promise<IBooking>;
    getBookingDetailsForAdmin(bookingId: string): Promise<IBookingDetailData>; 

}