export interface IBookingBotService {
  createBookingWithRazorpay(data: {
    userId: string;
    providerId: string;
    serviceId: string;
    addressId: string;
    amount: number;
    customerName: string;
    phone: string;
    scheduledDate: string;
    scheduledTime: string;
  }): Promise<{
    orderId: string;
    amount: number;
    key: string | undefined;
    currency: string;
    metadata: any;
  }>;

  verifyAndConfirmPayment(paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    metadata: {
      userId: string;
      providerId: string;
      serviceId: string;
      addressId: string;
      amount: number;
      customerName: string;
      phone: string;
      scheduledDate: string;
      scheduledTime: string;
    };
  }): Promise<any>;
}
