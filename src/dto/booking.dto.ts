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
}