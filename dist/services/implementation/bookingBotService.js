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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingBotService = void 0;
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../../di/type"));
let BookingBotService = class BookingBotService {
    constructor(bookingRepo, paymentService) {
        this.bookingRepo = bookingRepo;
        this.paymentService = paymentService;
    }
    createBookingWithRazorpay(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const order = yield this.paymentService.createOrder(data.amount);
            return {
                orderId: order.id,
                amount: data.amount,
                key: process.env.RAZORPAY_KEY_ID,
                currency: "INR",
                metadata: Object.assign({}, data),
            };
        });
    }
    verifyAndConfirmPayment(paymentData) {
        return __awaiter(this, void 0, void 0, function* () {
            const verified = yield this.paymentService.verifySignature(paymentData.razorpay_order_id, paymentData.razorpay_payment_id, paymentData.razorpay_signature);
            if (!verified)
                throw new Error("Payment verification failed");
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
            const savedBooking = yield this.bookingRepo.create(bookingData);
            return savedBooking;
        });
    }
};
exports.BookingBotService = BookingBotService;
exports.BookingBotService = BookingBotService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.BookingRepository)),
    __param(1, (0, inversify_1.inject)(type_1.default.PaymentService)),
    __metadata("design:paramtypes", [Object, Object])
], BookingBotService);
