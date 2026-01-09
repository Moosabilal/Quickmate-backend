var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { inject, injectable } from "inversify";
import {} from "../services/interface/IBookingService.js";
import TYPES from "../di/type.js";
import {} from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode.js";
import {} from "../middleware/authMiddleware.js";
import {} from "../interface/payment.js";
import {} from "../interface/auth.js";
import {} from "../services/interface/IProviderService.js";
import { ZodError } from "zod";
import { createBookingSchema, confirmPaymentSchema, verifyPaymentSchema, updateBookingStatusSchema, updateBookingDateTimeSchema, verifyBookingOtpSchema, adminBookingsQuerySchema, findProviderRangeSchema, bookingFilterSchema, providerBookingsQuerySchema, paramIdSchema, } from "../utils/validations/booking.validation.js";
import {} from "../enums/userRoles.js";
import { CustomError } from "../utils/CustomError.js";
let BookingController = class BookingController {
    _bookingService;
    _providerService;
    constructor(bookingService, providerService) {
        this._bookingService = bookingService;
        this._providerService = providerService;
    }
    createBooking = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const validatedBody = createBookingSchema.parse(req.body);
            const response = await this._bookingService.createNewBooking({
                ...validatedBody,
                userId,
            });
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    confirmPayment = async (req, res, next) => {
        try {
            const { amount } = confirmPaymentSchema.parse(req.body);
            const response = await this._bookingService.createPayment(amount);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    verifyPayment = async (req, res, next) => {
        try {
            const validatedBody = verifyPaymentSchema.parse(req.body);
            const paymentPayload = {
                ...validatedBody,
                userId: req.user.id,
            };
            const response = await this._bookingService.paymentVerification(paymentPayload);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            if (error instanceof ZodError) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            }
            next(error);
        }
    };
    getBookingById = async (req, res, next) => {
        try {
            const { id: bookingId } = paramIdSchema.parse(req.params);
            const response = await this._bookingService.findBookingById(bookingId);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    getAllBookings = async (req, res, next) => {
        try {
            const { search, status } = bookingFilterSchema.parse(req.query);
            const userId = req.user.id;
            const response = await this._bookingService.getAllFilteredBookings(userId, { search, status });
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            if (error instanceof ZodError) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            }
            next(error);
        }
    };
    getBookingFor_Prov_mngmnt = async (req, res, next) => {
        try {
            const { providerId, search, status } = providerBookingsQuerySchema.parse(req.query);
            const response = await this._bookingService.getBookingFor_Prov_mngmnt(providerId, search, status);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    getAllPreviousChats = async (req, res, next) => {
        try {
            const joiningId = req.params.joiningId;
            const response = await this._bookingService.getBookingMessages(joiningId);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    updateBookingStatus = async (req, res, next) => {
        try {
            const { id: bookingId } = paramIdSchema.parse(req.params);
            const { status, role } = updateBookingStatusSchema.parse(req.body);
            const userId = req.user.id;
            const response = await this._bookingService.updateStatus(bookingId, status, userId, role);
            const bookingVerifyToken = response.completionToken;
            res.cookie("bookingToken", bookingVerifyToken, {
                httpOnly: true,
                secure: false,
                sameSite: "strict",
                maxAge: 10 * 60 * 1000,
            });
            res.status(HttpStatusCode.OK).json(response.message);
        }
        catch (error) {
            next(error);
        }
    };
    updateBookingDateTime = async (req, res, next) => {
        try {
            const { id: bookingId } = paramIdSchema.parse(req.params);
            const { date, time } = updateBookingDateTimeSchema.parse(req.body);
            await this._bookingService.updateBookingDateTime(bookingId, date, time);
            res.status(HttpStatusCode.NO_CONTENT).send();
        }
        catch (error) {
            next(error);
        }
    };
    verifyOtp = async (req, res, next) => {
        try {
            const validatedBody = verifyBookingOtpSchema.parse(req.body);
            const bookingToken = req.cookies.bookingToken;
            const response = await this._bookingService.verifyOtp(validatedBody, bookingToken);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    resendOtp = async (req, res, next) => {
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
        }
        catch (error) {
            next(error);
        }
    };
    getAllBookingsForAdmin = async (req, res, next) => {
        try {
            const { page = 1, limit = 10, ...filters } = adminBookingsQuerySchema.parse(req.query);
            const response = await this._bookingService.getAllBookingsForAdmin(page, limit, filters);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    findProviderRange = async (req, res, next) => {
        try {
            const { serviceId, lat, lng, radius } = findProviderRangeSchema.parse(req.query);
            const userId = req.user.id;
            const userRole = req.user.role;
            const response = await this._bookingService.findProviderRange(userId, userRole, serviceId, Number(lat), Number(lng), Number(radius));
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    getBookingDetailsForAdmin = async (req, res, next) => {
        try {
            const { id } = paramIdSchema.parse(req.params);
            const data = await this._bookingService.getBookingDetailsForAdmin(id);
            res.status(HttpStatusCode.OK).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    };
    refundPayment = async (req, res, next) => {
        try {
            const { paymentId, amount } = req.body;
            const userId = req.user.id;
            if (!paymentId || !amount) {
                throw new CustomError("Payment ID and Amount are required", HttpStatusCode.BAD_REQUEST);
            }
            const result = await this._bookingService.refundPayment(paymentId, Number(amount), userId);
            res.status(HttpStatusCode.OK).json(result);
        }
        catch (error) {
            next(error);
        }
    };
};
BookingController = __decorate([
    injectable(),
    __param(0, inject(TYPES.BookingService)),
    __param(1, inject(TYPES.ProviderService)),
    __metadata("design:paramtypes", [Object, Object])
], BookingController);
export { BookingController };
