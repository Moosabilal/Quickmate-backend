import { inject, injectable } from "inversify";
import { IBookingService } from "../services/interface/IBookingService";
import TYPES from "../di/type";
import { NextFunction, Request, Response } from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { AuthRequest } from "../middleware/authMiddleware";
import { IPaymentVerificationRequest } from "../interface/payment";
import { ResendOtpRequestBody, VerifyOtpRequestBody } from "../interface/auth";
import { IProviderService } from "../services/interface/IProviderService";
import { ZodError } from "zod";
import {
    createBookingSchema,
    confirmPaymentSchema,
    verifyPaymentSchema,
    mongoIdParamSchema,
    updateBookingStatusSchema,
    updateBookingDateTimeSchema,
    verifyBookingOtpSchema,
    adminBookingsQuerySchema,
    findProviderRangeSchema,
    bookingFilterSchema,
    providerBookingsQuerySchema,
} from "../utils/validations/booking.validation";
import { Roles } from "../enums/userRoles";

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
            const userId = req.user.id
            const validatedBody = createBookingSchema.parse(req.body);
            const response = await this._bookingService.createNewBooking({ ...validatedBody, userId })

            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public confirmPayment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { amount } = confirmPaymentSchema.parse(req.body);
            const response = await this._bookingService.createPayment(amount)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public verifyPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const validatedBody = verifyPaymentSchema.parse(req.body);

            const paymentPayload: IPaymentVerificationRequest = {
                ...validatedBody,
                userId: req.user.id,
            };

            const response = await this._bookingService.paymentVerification(paymentPayload);

            res.status(HttpStatusCode.OK).json(response);
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            }
            next(error);
        }
    }

    public getBookingById = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { id: bookingId } = mongoIdParamSchema.parse(req.params);
            const response = await this._bookingService.findBookingById(bookingId)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getAllBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { search, status } = bookingFilterSchema.parse(req.query);

            const userId = req.user.id;

            const response = await this._bookingService.getAllFilteredBookings(userId, { search, status });

            res.status(HttpStatusCode.OK).json(response);
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            }
            next(error);
        }
    }

    public getBookingFor_Prov_mngmnt = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {

            const { providerId, search, status } = providerBookingsQuerySchema.parse(req.query);
            const response = await this._bookingService.getBookingFor_Prov_mngmnt(providerId, search, status)
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
            const { id: bookingId } = mongoIdParamSchema.parse(req.params);
            const { status } = updateBookingStatusSchema.parse(req.body);
            const userId = req.user.id
            const response = await this._bookingService.updateStatus(bookingId, status, userId)
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
            const { id: bookingId } = mongoIdParamSchema.parse(req.params);
            const { date, time } = updateBookingDateTimeSchema.parse(req.body);
            await this._bookingService.updateBookingDateTime(bookingId, date, time);
            res.status(HttpStatusCode.NO_CONTENT).send()
        } catch (error) {
            next(error)
        }
    }

    public verifyOtp = async (req: Request<{}, {}, VerifyOtpRequestBody>, res: Response, next: NextFunction) => {
        try {
            const validatedBody = verifyBookingOtpSchema.parse(req.body);
            const bookingToken: string = req.cookies.bookingToken;
            const response = await this._bookingService.verifyOtp(validatedBody, bookingToken);
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
            const { page = 1, limit = 10, ...filters } = adminBookingsQuerySchema.parse(req.query);
            const response = await this._bookingService.getAllBookingsForAdmin(page, limit, filters);

            res.status(HttpStatusCode.OK).json(response);
        } catch (error) {
            next(error);
        }
    }

    public findProviderRange = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { serviceId, lat, lng, radius } = findProviderRangeSchema.parse(req.query);
            const userId = req.user.id
            const userRole = req.user.role as Roles
            const response = await this._bookingService.findProviderRange(userId, userRole, serviceId as string, Number(lat), Number(lng), Number(radius));
            res.status(HttpStatusCode.OK).json(response);
        } catch (error) {
            next(error);
        }
    }

    public getBookingDetailsForAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = mongoIdParamSchema.parse(req.params);
            const data = await this._bookingService.getBookingDetailsForAdmin(id);
            res.status(HttpStatusCode.OK).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }


}