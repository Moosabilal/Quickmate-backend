import { inject, injectable } from "inversify";
import { parse, formatISO } from "date-fns";
import { IBookingService } from "../services/interface/IBookingService";
import TYPES from "../di/type";
import { NextFunction, Request, Response } from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { AuthRequest } from "../middleware/authMiddleware";
import { IPaymentVerificationRequest } from "../interface/payment";
import { ResendOtpRequestBody, VerifyOtpRequestBody } from "../interface/auth";
import { IProviderService } from "../services/interface/IProviderService";
import { BookingStatus } from "../enums/booking.enum";

@injectable()
export class BookingController {
    private _bookingService: IBookingService;
    private _providerService: IProviderService;
    constructor(@inject(TYPES.BookingService) bookingService: IBookingService,
        @inject(TYPES.ProviderService) providerService: IProviderService
    ) {
        this._bookingService = bookingService
        this._providerService = providerService
    }

    public createBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            console.log('the req body', req.body)
            const providerId = req.body.providerId as string;
            const customerName = req.body.customerName as string;
            const scheduledDate = req.body.scheduledDate as string;
            const scheduledTime = req.body.scheduledTime as string;
            const serviceId = req.body.serviceId as string;

            const combinedDate = parse(
                `${scheduledDate} ${scheduledTime}`,
                "yyyy-MM-dd hh:mm a",
                new Date()
            );

            const startDate = formatISO(combinedDate);

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
            const search = req.query.search as string
            const userId = req.user.id
            const response = await this._bookingService.getBookingFor_Prov_mngmnt(userId, providerId, search)
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

    public getAllBookingsForAdmin = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const filters = {
                search: req.query.search as string | undefined,
                bookingStatus: req.query.bookingStatus as BookingStatus | undefined,
                serviceType: req.query.serviceType as string | undefined,
                dateRange: req.query.dateRange as string | undefined,
            };
            
            const response = await this._bookingService.getAllBookingsForAdmin(page, limit, filters);

            res.status(HttpStatusCode.OK).json(response);
        } catch (error) {
            next(error);
        }
    }

    public findProviderRange = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { serviceId, lat, lng, radius } = req.query;
            const response = await this._bookingService.findProviderRange(serviceId as string, Number(lat), Number(lng), Number(radius));
            res.status(HttpStatusCode.OK).json(response);
        } catch (error) {
            next(error);
        }
    }

}