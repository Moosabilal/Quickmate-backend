import { inject, injectable } from "inversify";
import { IBookingService } from "../services/interface/IBookingService";
import TYPES from "../di/type";
import { NextFunction, Request, Response } from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { AuthRequest } from "../middleware/authMiddleware";
import { IPaymentVerificationRequest } from "../dto/payment.dto";

@injectable()
export class BookingController {
    private bookingService: IBookingService
    constructor(@inject(TYPES.BookingService) bookingService: IBookingService){
        this.bookingService = bookingService
    }

    public createBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            console.log('the amount type', typeof req.body.amount)
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

    public verifyPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const paymentData: IPaymentVerificationRequest = {
                ...req.body,
                userId: req.user.id,
                adminCommisson: 0,
                providerAmount: 0,
            }
            const response = await this.bookingService.paymentVerification(paymentData)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getBookingById = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const bookingId = req.params.id
            const response = await this.bookingService.findBookingById(bookingId)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getAllBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user.id;
            const response = await this.bookingService.getAllFilteredBookings(userId)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getBookingFor_Prov_mngmnt = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const providerId = req.params.id
            console.log('the userid', providerId)
            const response = await this.bookingService.getBookingFor_Prov_mngmnt(providerId)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getAllPreviousChats = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const bookingId = req.params.bookingId
            const response = await this.bookingService.getBookingMessages(bookingId)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public cancelBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const bookingId = req.params.id
            const response = await this.bookingService.cancelBooking(bookingId)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }
}