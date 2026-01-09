import { inject, injectable } from "inversify";
import { type IBookingService } from "../services/interface/IBookingService.js";
import TYPES from "../di/type.js";
import { type NextFunction, type Request, type Response } from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode.js";
import { type AuthRequest } from "../middleware/authMiddleware.js";
import { type IPaymentVerificationRequest } from "../interface/payment.js";
import { type ResendOtpRequestBody, type VerifyOtpRequestBody } from "../interface/auth.js";
import { type IProviderService } from "../services/interface/IProviderService.js";
import { ZodError } from "zod";
import {
  createBookingSchema,
  confirmPaymentSchema,
  verifyPaymentSchema,
  updateBookingStatusSchema,
  updateBookingDateTimeSchema,
  verifyBookingOtpSchema,
  adminBookingsQuerySchema,
  findProviderRangeSchema,
  bookingFilterSchema,
  providerBookingsQuerySchema,
  paramIdSchema,
} from "../utils/validations/booking.validation.js";
import { type Roles } from "../enums/userRoles.js";
import { CustomError } from "../utils/CustomError.js";

@injectable()
export class BookingController {
  private _bookingService: IBookingService;
  private _providerService: IProviderService;
  constructor(
    @inject(TYPES.BookingService) bookingService: IBookingService,
    @inject(TYPES.ProviderService) providerService: IProviderService,
  ) {
    this._bookingService = bookingService;
    this._providerService = providerService;
  }

  public createBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const validatedBody = createBookingSchema.parse(req.body);
      const response = await this._bookingService.createNewBooking({
        ...validatedBody,
        userId,
      });

      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  public confirmPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount } = confirmPaymentSchema.parse(req.body);
      const response = await this._bookingService.createPayment(amount);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

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
  };

  public getBookingById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id: bookingId } = paramIdSchema.parse(req.params);
      const response = await this._bookingService.findBookingById(bookingId);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

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
  };

  public getBookingFor_Prov_mngmnt = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { providerId, search, status } = providerBookingsQuerySchema.parse(req.query);
      const response = await this._bookingService.getBookingFor_Prov_mngmnt(providerId, search, status);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getAllPreviousChats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const joiningId = req.params.joiningId;
      const response = await this._bookingService.getBookingMessages(joiningId);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  public updateBookingStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id: bookingId } = paramIdSchema.parse(req.params);
      const { status, role } = updateBookingStatusSchema.parse(req.body);
      const userId = req.user.id;
      const response = await this._bookingService.updateStatus(bookingId, status, userId, role as Roles);
      const bookingVerifyToken = response.completionToken;
      res.cookie("bookingToken", bookingVerifyToken, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 10 * 60 * 1000,
      });

      res.status(HttpStatusCode.OK).json(response.message);
    } catch (error) {
      next(error);
    }
  };

  public updateBookingDateTime = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id: bookingId } = paramIdSchema.parse(req.params);
      const { date, time } = updateBookingDateTimeSchema.parse(req.body);
      await this._bookingService.updateBookingDateTime(bookingId, date, time);
      res.status(HttpStatusCode.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  };

  public verifyOtp = async (
    req: Request<Record<string, never>, unknown, VerifyOtpRequestBody>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validatedBody = verifyBookingOtpSchema.parse(req.body);
      const bookingToken: string = req.cookies.bookingToken;
      const response = await this._bookingService.verifyOtp(validatedBody, bookingToken);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  public resendOtp = async (req: AuthRequest & { body: ResendOtpRequestBody }, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const response = await this._bookingService.resendOtp(req.body, userId);
      const newBookingVerifyToken = response.newCompletionToken;
      res.cookie("bookingToken", newBookingVerifyToken, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 10 * 60 * 1000,
      });
      res.status(HttpStatusCode.OK).json(response.message);
    } catch (error) {
      next(error);
    }
  };

  public getAllBookingsForAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 10, ...filters } = adminBookingsQuerySchema.parse(req.query);
      const response = await this._bookingService.getAllBookingsForAdmin(page, limit, filters);

      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  public findProviderRange = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { serviceId, lat, lng, radius } = findProviderRangeSchema.parse(req.query);
      const userId = req.user.id;
      const userRole = req.user.role as Roles;
      const response = await this._bookingService.findProviderRange(
        userId,
        userRole,
        serviceId,
        Number(lat),
        Number(lng),
        Number(radius),
      );
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getBookingDetailsForAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = paramIdSchema.parse(req.params);
      const data = await this._bookingService.getBookingDetailsForAdmin(id);
      res.status(HttpStatusCode.OK).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  public refundPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentId, amount } = req.body;
      const userId = req.user.id;

      if (!paymentId || !amount) {
        throw new CustomError("Payment ID and Amount are required", HttpStatusCode.BAD_REQUEST);
      }

      const result = await this._bookingService.refundPayment(paymentId, Number(amount), userId);
      res.status(HttpStatusCode.OK).json(result);
    } catch (error) {
      next(error);
    }
  };
}
