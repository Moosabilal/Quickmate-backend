"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingController = void 0;
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../di/type"));
const HttpStatusCode_1 = require("../enums/HttpStatusCode");
const zod_1 = require("zod");
const booking_validation_1 = require("../utils/validations/booking.validation");
let BookingController = class BookingController {
    constructor(bookingService, providerService) {
        this.createBooking = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const validatedBody = booking_validation_1.createBookingSchema.parse(req.body);
                const response = yield this._bookingService.createNewBooking(Object.assign(Object.assign({}, validatedBody), { userId }));
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.confirmPayment = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { amount } = booking_validation_1.confirmPaymentSchema.parse(req.body);
                const response = yield this._bookingService.createPayment(amount);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.verifyPayment = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const validatedBody = booking_validation_1.verifyPaymentSchema.parse(req.body);
                const paymentPayload = Object.assign(Object.assign({}, validatedBody), { userId: req.user.id });
                const response = yield this._bookingService.paymentVerification(paymentPayload);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                }
                next(error);
            }
        });
        this.getBookingById = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id: bookingId } = booking_validation_1.paramIdSchema.parse(req.params);
                const response = yield this._bookingService.findBookingById(bookingId);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.getAllBookings = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { search, status } = booking_validation_1.bookingFilterSchema.parse(req.query);
                const userId = req.user.id;
                const response = yield this._bookingService.getAllFilteredBookings(userId, { search, status });
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                }
                next(error);
            }
        });
        this.getBookingFor_Prov_mngmnt = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { providerId, search, status } = booking_validation_1.providerBookingsQuerySchema.parse(req.query);
                const response = yield this._bookingService.getBookingFor_Prov_mngmnt(providerId, search, status);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.getAllPreviousChats = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const joiningId = req.params.joiningId;
                const response = yield this._bookingService.getBookingMessages(joiningId);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.updateBookingStatus = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id: bookingId } = booking_validation_1.paramIdSchema.parse(req.params);
                const { status, role } = booking_validation_1.updateBookingStatusSchema.parse(req.body);
                const userId = req.user.id;
                const response = yield this._bookingService.updateStatus(bookingId, status, userId, role);
                let bookingVerifyToken = response.completionToken;
                res.cookie('bookingToken', bookingVerifyToken, {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'strict',
                    maxAge: 10 * 60 * 1000
                });
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response.message);
            }
            catch (error) {
                next(error);
            }
        });
        this.updateBookingDateTime = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id: bookingId } = booking_validation_1.paramIdSchema.parse(req.params);
                const { date, time } = booking_validation_1.updateBookingDateTimeSchema.parse(req.body);
                yield this._bookingService.updateBookingDateTime(bookingId, date, time);
                res.status(HttpStatusCode_1.HttpStatusCode.NO_CONTENT).send();
            }
            catch (error) {
                next(error);
            }
        });
        this.verifyOtp = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const validatedBody = booking_validation_1.verifyBookingOtpSchema.parse(req.body);
                const bookingToken = req.cookies.bookingToken;
                const response = yield this._bookingService.verifyOtp(validatedBody, bookingToken);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.resendOtp = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const response = yield this._bookingService.resendOtp(req.body, userId);
                let newBookingVerifyToken = response.newCompletionToken;
                res.cookie('bookingToken', newBookingVerifyToken, {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'strict',
                    maxAge: 10 * 60 * 1000
                });
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response.message);
            }
            catch (error) {
                next(error);
            }
        });
        this.getAllBookingsForAdmin = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const _a = booking_validation_1.adminBookingsQuerySchema.parse(req.query), { page = 1, limit = 10 } = _a, filters = __rest(_a, ["page", "limit"]);
                const response = yield this._bookingService.getAllBookingsForAdmin(page, limit, filters);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.findProviderRange = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { serviceId, lat, lng, radius } = booking_validation_1.findProviderRangeSchema.parse(req.query);
                const userId = req.user.id;
                const userRole = req.user.role;
                const response = yield this._bookingService.findProviderRange(userId, userRole, serviceId, Number(lat), Number(lng), Number(radius));
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.getBookingDetailsForAdmin = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = booking_validation_1.paramIdSchema.parse(req.params);
                const data = yield this._bookingService.getBookingDetailsForAdmin(id);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({ success: true, data });
            }
            catch (error) {
                next(error);
            }
        });
        this._bookingService = bookingService;
        this._providerService = providerService;
    }
};
exports.BookingController = BookingController;
exports.BookingController = BookingController = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.BookingService)),
    __param(1, (0, inversify_1.inject)(type_1.default.ProviderService)),
    __metadata("design:paramtypes", [Object, Object])
], BookingController);
