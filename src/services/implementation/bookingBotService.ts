import { inject, injectable } from "inversify";
import { IBookingRepository } from "../../repositories/interface/IBookingRepository";
import { IPaymentService } from "../interface/IPaymentService";
import { IBookingBotService } from "../interface/IBookingBotService";
import TYPES from "../../di/type";

@injectable()
export class BookingBotService implements IBookingBotService {
  constructor(
    @inject(TYPES.BookingRepository) private bookingRepo: IBookingRepository,
    @inject(TYPES.PaymentService) private paymentService: IPaymentService
  ) {}

  async createBookingWithRazorpay(data: {
    userId: string;
    providerId: string;
    serviceId: string;
    addressId: string;
    amount: number;
    customerName: string;
    phone: string;
    scheduledDate: string;
    scheduledTime: string;
  }) {
    const order = await this.paymentService.createOrder(data.amount);

    return {
      orderId: order.id,
      amount: data.amount,
      key: process.env.RAZORPAY_KEY_ID,
      currency: "INR",
      metadata: { ...data },
    };
  }

  async verifyAndConfirmPayment(paymentData: {
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
  }) {
    const verified = await this.paymentService.verifySignature(
      paymentData.razorpay_order_id,
      paymentData.razorpay_payment_id,
      paymentData.razorpay_signature
    );

    if (!verified) throw new Error("Payment verification failed");

    const bookingData = {
      userId: paymentData.metadata.userId,
      providerId: paymentData.metadata.providerId,
      serviceId: paymentData.metadata.serviceId,
      addressId: paymentData.metadata.addressId,
      customerName: paymentData.metadata.customerName,
      phone: paymentData.metadata.phone,
      instructions: "",
      paymentStatus: "Paid",
      amount: String(paymentData.metadata.amount),
      status: "Pending",
      scheduledDate: paymentData.metadata.scheduledDate,
      scheduledTime: paymentData.metadata.scheduledTime,
      createdBy: "Bot",
      duration: 90,
      paymentId: paymentData.razorpay_payment_id,
    };

    const savedBooking = await this.bookingRepo.create(bookingData);
    return savedBooking;
  }
}
