import { type Types } from "mongoose";
import { type BookingStatus } from "../enums/booking.enum.js";
import { type PaymentStatus } from "../enums/userRoles.js";
import { type DaySchedule } from "./provider.js";

export interface IBookingRequest {
  userId?: string;
  serviceId: string;
  providerId: string;
  customerName: string;
  phone: string;
  instructions?: string;
  addressId: string;
  scheduledDate?: string;
  scheduledTime?: string;
  amount: number;
}

export interface IBookingConfirmationRes {
  id: string;
  bookedOrderId: string;
  serviceName: string;
  serviceImage: string;
  providerName: string;
  providerImage: string;
  providerRating?: number;
  providerReviewsCount?: number;
  priceUnit: string;
  duration: string;
  customer?: string;
  phone: string;
  date: string;
  time: string;
  address: {
    label: string;
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  amount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  specialInstruction: string;
  providerTimings?: DaySchedule[];
  createdAt: Date;
  reviewed?: boolean;
  rating?: number;
  review?: string;
}

export interface IBookingHistoryPage {
  id: string;
  serviceName: string;
  serviceImage: string;
  providerName: string;
  providerImage: string;
  date: string;
  time: string;
  status: BookingStatus;
  price: number;
  location: string;
  priceUnit: string;
  duration?: string;
  description?: string;
  createdAt?: Date;
}

export interface IProviderBookingManagement {
  id: string;
  customerId?: string;
  customerName: string;
  customerImage: string;
  service: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  payment: number;
  paymentStatus: string;
  status: BookingStatus;
  description: string;
  customerPhone: string;
  customerEmail: string;
  specialRequests: string;
  createdAt: string;
}

export interface IGetMessages {
  id: string;
  bookingId: string;
  senderId: string;
  text: string;
}

export interface BookingOtpPayload {
  bookingId: string;
  otp: string;
  iat: number;
  exp: number;
}

export interface IBookingLog {
  id: string;
  userName: string;
  userAvatar: string;
  providerName: string;
  serviceType: string;
  dateTime: string;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
}

export interface IAdminBookingsResponse {
  bookings: IBookingLog[];
  totalPages: number;
  currentPage: number;
  totalBookings: number;
}

export interface IBookingStatusCounts {
  [BookingStatus.All]: number;
  [BookingStatus.PENDING]: number;
  [BookingStatus.CONFIRMED]: number;
  [BookingStatus.IN_PROGRESS]: number;
  [BookingStatus.COMPLETED]: number;
  [BookingStatus.CANCELLED]: number;
  [BookingStatus.EXPIRED]: number;
}

export interface IBookingStatusCount {
  _id: BookingStatus | null;
  count: number;
}

export interface IUserBookingsResponse {
  data: IBookingHistoryPage[];
  counts: IBookingStatusCounts;
}

export interface IProviderBookingsResponse {
  bookings: IProviderBookingManagement[];
  earnings: number;
  counts: IBookingStatusCounts;
}

export interface IBookingDetailData {
  booking: {
    _id: string;
    status: BookingStatus;
    paymentStatus: string;
    amount: string;
    date: string;
    time: string;
    createdAt: string;
    instructions?: string;
  };
  user: { name: string; email: string; phone: string; image: string };
  provider: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    image: string;
    serviceArea: string;
  };
  service: { title: string; duration: string; price: number };
  address: { label: string; fullAddress: string };
  payment?: { method: string; transactionId: string; date: string };
}

export interface IPopulatedBookingForEarnings {
  _id?: Types.ObjectId | string;
  amount: string | number;
  status: BookingStatus | unknown;
  userId: {
    _id: Types.ObjectId | string;
    name: string | unknown;
  };
  serviceId: {
    _id?: Types.ObjectId | string;
    title: string;
  };
  updatedAt?: Date;
  createdAt?: Date;
}
