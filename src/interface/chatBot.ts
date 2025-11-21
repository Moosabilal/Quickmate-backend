export interface IChatbotResponse {
    role: 'model';
    text: string;
    action?: 'REQUIRE_PAYMENT'; 
    payload?: {
        orderId: string;
        amount: number;
        bookingData: any; 
    };
}

interface IBookingRequest {
  serviceId: string;
  providerId: string;
  customerName: string;
  phone: string;
  instructions?: string;
  addressId?: string
  amount?: number;
  scheduledDate?: string;
  scheduledTime?: string;
}

export interface IChatPaymentVerify {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  bookingData: IBookingRequest;
}