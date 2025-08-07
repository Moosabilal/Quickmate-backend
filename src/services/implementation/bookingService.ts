import { inject, injectable } from "inversify";
import { IBookingRepository } from "../../repositories/interface/IBookingRepository";
import { IBookingService } from "../interface/IBookingService";
import TYPES from "../../di/type";
import { IBookingRequest } from "../../dto/booking.dto";
import { razorpay } from "../../utils/razorpay";
import { CustomError } from "../../utils/CustomError";
import { ErrorMessage } from "../../enums/ErrorMessage";
import { HttpStatusCode } from "../../enums/HttpStatusCode";
import { RazorpayOrder } from "../../dto/razorpay.dto";
import { createHmac } from "crypto";

@injectable()
export class BookingService implements IBookingService {
    private bookingRepository: IBookingRepository
    constructor(@inject(TYPES.BookingRepository) bookingRepository: IBookingRepository) {
        this.bookingRepository = bookingRepository
    }

    async createNewBooking(data: IBookingRequest): Promise<{ bookingId: string, message: string }> {
        const bookings = await this.bookingRepository.saveBooking(data)
        return { bookingId: (bookings._id as { toString(): string }).toString(), message: "your booking confirmed successfully" }
    }

    async createPayment(amount: number, currency: string, receipt: string): Promise<RazorpayOrder> {
        const order = await razorpay.orders.create({
            amount: amount * 100,
            currency,
            receipt
        });

        if (!order) {
            throw new CustomError(ErrorMessage.INTERNAL_ERROR, HttpStatusCode.INTERNAL_SERVER_ERROR)
        }

        return order as RazorpayOrder;
    }

    async paymentVerification(razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string): Promise<{message: string, orderId: string, paymentId: string}> {
        const sha = createHmac("sha256", process.env.RAZORPAY_SECRET);

        sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const digest = sha.digest("hex");
        if(digest !== razorpay_signature){
            throw new CustomError("transaction is not legit", HttpStatusCode.BAD_REQUEST)
        }

        return {
            message: "payment successfully verified",
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id
        }
    }
}