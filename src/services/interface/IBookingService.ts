import { type ResendOtpRequestBody, type VerifyOtpRequestBody } from "../../interface/auth";
import {
  type IAdminBookingsResponse,
  type IBookingConfirmationRes,
  type IBookingDetailData,
  type IBookingRequest,
  type IProviderBookingManagement,
  type IUserBookingsResponse,
} from "../../interface/booking";
import { type IPaymentVerificationRequest } from "../../interface/payment";
import { type RazorpayOrder } from "../../interface/razorpay";
import { type BookingStatus } from "../../enums/booking.enum";
import { type IMessage } from "../../models/message";
import { type Roles } from "../../enums/userRoles";
import { type ISocketMessage } from "../../interface/message";
import { type IBooking } from "../../models/Booking";
import { type Server } from "socket.io";

export interface IBookingService {
  createNewBooking(data: IBookingRequest): Promise<{ message: string }>;
  createPayment(amount: number): Promise<RazorpayOrder>;
  paymentVerification(verifyPayment: IPaymentVerificationRequest): Promise<{ message: string; orderId: string }>;
  findBookingById(id: string): Promise<IBookingConfirmationRes>;
  getAllFilteredBookings(
    userId: string,
    filters: { search?: string; status?: BookingStatus },
  ): Promise<IUserBookingsResponse>;
  updateStatus(
    bookingId: string,
    status: BookingStatus,
    userId?: string,
    role?: Roles,
  ): Promise<{ message: string; completionToken?: string }>;
  updateBookingDateTime(bookingId: string, date: string, time: string): Promise<void>;
  getBookingFor_Prov_mngmnt(
    providerId: string,
    search?: string,
    status?: BookingStatus,
  ): Promise<{ earnings: number; bookings: IProviderBookingManagement[] }>;
  saveAndEmitMessage(io: Server, messageData: ISocketMessage): Promise<Partial<IMessage>>;
  getBookingMessages(joiningId: string): Promise<ISocketMessage[]>;
  verifyOtp(data: VerifyOtpRequestBody, bookingToken: string): Promise<void>;
  resendOtp(data: ResendOtpRequestBody, userId?: string): Promise<{ message: string; newCompletionToken?: string }>;
  getAllBookingsForAdmin(
    page: number,
    limit: number,
    filters: { search?: string; bookingStatus?: string; dateRange?: string },
  ): Promise<IAdminBookingsResponse>;
  findProviderRange(
    userId: string,
    userRole: Roles,
    serviceId: string,
    lat: number,
    lng: number,
    radius: number,
  ): Promise<boolean>;
  createBookingFromBot(data: IBookingRequest): Promise<IBooking>;
  getBookingDetailsForAdmin(bookingId: string): Promise<IBookingDetailData>;
  refundPayment(paymentId: string, amount: number, userId: string): Promise<{ refundId: string; message: string }>;
}
