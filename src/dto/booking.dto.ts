import { BookingStatus } from "../enums/booking.enum";
import { PaymentStatus } from "../enums/userRoles";

export interface IBookingRequest {
  userId?: string
  serviceId: string;
  providerId: string;
  customerName: string;
  phone: string;
  instructions?: string;
  addressId: string
  scheduledDate?: string;
  scheduledTime?: string;
}

export interface IBookingConfirmationRes {
  id: string;
  bookedOrderId: string
  serviceName: string;
  serviceImage: string;
  providerName: string;
  providerImage: string;
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
  providerTimings?: { day: string; startTime: string; endTime: string }[];
  createdAt: Date;
}


export interface IBookingHistoryPage {
  id: string;
  serviceName: string;
  serviceImage: string;
  providerName: string
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
  customerName: string;
  customerImage: string;
  service: string;    //service
  date: string;       //bookings
  time: string;       //bookings
  duration: string;   //service
  location: string;   //address
  payment: number;    //service
  paymentStatus: string;  //payment
  status: BookingStatus;  //booking
  description: string;    //service
  customerPhone: string;  //boooking
  customerEmail: string;  //booking
  specialRequests: string;    //bookings
  createdAt: string;      //booking
  // rating: number | null;
}

export interface IGetMessages {
  id: string;
  bookingId: string,
  senderId: string,
  text: string

}

export interface BookingOtpPayload {
  bookingId: string;
  otp: string;
  iat: number;
  exp: number; 
}