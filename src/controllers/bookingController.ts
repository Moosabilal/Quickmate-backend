import { inject, injectable } from "inversify";
import { IBookingService } from "../services/interface/IBookingService";
import TYPES from "../di/type";
import { NextFunction, Request, Response } from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode";

@injectable()
export class BookingController {
    private bookingService: IBookingService
    constructor(@inject(TYPES.BookingService) bookingService: IBookingService){
        this.bookingService = bookingService
    }

    public createBooking = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const response = await this.bookingService.createNewBooking(req.body)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public confirmPayment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {amount, currency, receipt} = req.body
            const response = await this.bookingService.createPayment(amount, currency, receipt)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {razorpay_order_id, razorpay_payment_id, razorpay_signature} = req.body
            const response = await this.bookingService.paymentVerification(razorpay_order_id, razorpay_payment_id, razorpay_signature)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }
}