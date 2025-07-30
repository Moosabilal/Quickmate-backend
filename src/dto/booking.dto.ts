export interface IBookingRequest {
  serviceId: string;
  providerId: string;
  customerName: string;
  phone: string;
  instructions?: string;
  addressId: string
//   scheduledDate?: string;
//   scheduledTime?: string;
}