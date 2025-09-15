import { inject, injectable } from "inversify";
import { IBookingService } from "../services/interface/IBookingService";
import TYPES from "../di/type";
import { NextFunction, Request, Response } from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { AuthRequest } from "../middleware/authMiddleware";
import { IPaymentVerificationRequest } from "../interface/payment.dto";
import { ResendOtpRequestBody, VerifyOtpRequestBody } from "../interface/auth.dto";

@injectable()
export class BookingController {
    private _bookingService: IBookingService
    constructor(@inject(TYPES.BookingService) bookingService: IBookingService) {
        this._bookingService = bookingService
    }

    public createBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const response = await this._bookingService.createNewBooking(req.body)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public confirmPayment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { amount } = req.body
            const response = await this._bookingService.createPayment(amount)
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
            const response = await this._bookingService.paymentVerification(paymentData)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getBookingById = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const bookingId = req.params.id
            const response = await this._bookingService.findBookingById(bookingId)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getAllBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user.id;
            const response = await this._bookingService.getAllFilteredBookings(userId)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getBookingFor_Prov_mngmnt = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const providerId = req.params.id
            const userId = req.user.id
            const response = await this._bookingService.getBookingFor_Prov_mngmnt(userId, providerId)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getAllPreviousChats = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const joiningId = req.params.joiningId
            const response = await this._bookingService.getBookingMessages(joiningId)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public updateBookingStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const bookingId = req.params.id
            const userId = req.user.id
            const response = await this._bookingService.updateStatus(bookingId, req.body.status, userId)
            let bookingVerifyToken = response.completionToken
            res.cookie('bookingToken', bookingVerifyToken, {
                httpOnly: true,
                secure: false,
                sameSite: 'strict',
                maxAge: 10 * 60 * 1000
            })

            res.status(HttpStatusCode.OK).json(response.message)
        } catch (error) {
            next(error)
        }
    }

    public updateBookingDateTime = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const bookingId = req.params.id
            const { date, time } = req.body;
            await this._bookingService.updateBookingDateTime(bookingId, date, time);
            res.status(HttpStatusCode.NO_CONTENT).send()
        } catch (error) {
            next(error)
        }
    }

    public verifyOtp = async (req: Request<{}, {}, VerifyOtpRequestBody>, res: Response, next: NextFunction) => {
        try {
            const bookingToken: string = req.cookies.bookingToken
            const response = await this._bookingService.verifyOtp(req.body, bookingToken);
            res.status(HttpStatusCode.OK).json(response);
        } catch (error) {
            next(error);
        }
    }

    public resendOtp = async (req: AuthRequest & { body: ResendOtpRequestBody }, res: Response, next: NextFunction) => {
        try {
            const userId = req.user.id
            const response = await this._bookingService.resendOtp(req.body, userId);
            let newBookingVerifyToken = response.newCompletionToken
            res.cookie('bookingToken', newBookingVerifyToken, {
                httpOnly: true,
                secure: false,
                sameSite: 'strict',
                maxAge: 10 * 60 * 1000
            })
            res.status(HttpStatusCode.OK).json(response.message);
        } catch (error) {
            next(error);
        }
    }

}