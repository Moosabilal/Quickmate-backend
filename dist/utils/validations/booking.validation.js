"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyChatPaymentSchema = exports.chatBookingSchema = exports.providerBookingsQuerySchema = exports.bookingFilterSchema = exports.findProviderRangeSchema = exports.adminBookingsQuerySchema = exports.verifyBookingOtpSchema = exports.updateBookingDateTimeSchema = exports.updateBookingStatusSchema = exports.verifyPaymentSchema = exports.confirmPaymentSchema = exports.createBookingSchema = exports.mongoIdParamSchema = void 0;
const zod_1 = require("zod");
const booking_enum_1 = require("../../enums/booking.enum");
const userRoles_1 = require("../../enums/userRoles");
exports.mongoIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
});
exports.createBookingSchema = zod_1.z.object({
    providerId: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Provider ID'),
    serviceId: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Service ID'),
    addressId: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Address ID'),
    customerName: zod_1.z.string().min(2, "Customer name is required."),
    phone: zod_1.z.string().min(10, "A valid phone number is required."),
    amount: zod_1.z.coerce.number().positive("Amount must be a positive number."),
    scheduledDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD'),
    scheduledTime: zod_1.z.string().regex(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/, 'Invalid time format. Expected hh:mm AM/PM'),
    instructions: zod_1.z.string().optional(),
});
exports.confirmPaymentSchema = zod_1.z.object({
    amount: zod_1.z.number().positive("Amount must be a positive number."),
});
exports.verifyPaymentSchema = zod_1.z.object({
    razorpay_order_id: zod_1.z.string(),
    razorpay_payment_id: zod_1.z.string().optional(),
    razorpay_signature: zod_1.z.string().optional(),
    bookingId: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Booking ID'),
    providerId: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Provider ID'),
    paymentMethod: zod_1.z.nativeEnum(userRoles_1.PaymentMethod),
    paymentDate: zod_1.z.coerce.date(),
    amount: zod_1.z.number().positive(),
});
exports.updateBookingStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(booking_enum_1.BookingStatus),
});
exports.updateBookingDateTimeSchema = zod_1.z.object({
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD'),
    time: zod_1.z.string().regex(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/, 'Invalid time format. Expected hh:mm AM/PM'),
});
exports.verifyBookingOtpSchema = zod_1.z.object({
    email: zod_1.z.string().email("A valid email is required."),
    otp: zod_1.z.string().length(6, "OTP must be 6 digits."),
});
exports.adminBookingsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().optional(),
    search: zod_1.z.string().optional(),
    bookingStatus: zod_1.z.nativeEnum(booking_enum_1.BookingStatus).optional(),
    dateRange: zod_1.z.string().optional(),
});
exports.findProviderRangeSchema = zod_1.z.object({
    serviceId: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Service ID'),
    lat: zod_1.z.coerce.number(),
    lng: zod_1.z.coerce.number(),
    radius: zod_1.z.coerce.number().positive(),
});
exports.bookingFilterSchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    status: zod_1.z.nativeEnum(booking_enum_1.BookingStatus).optional()
        .transform(val => (val === booking_enum_1.BookingStatus.All) ? undefined : val),
});
exports.providerBookingsQuerySchema = exports.bookingFilterSchema.extend({
    providerId: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
});
exports.chatBookingSchema = exports.createBookingSchema.extend({
    userId: zod_1.z.string().optional(),
});
exports.verifyChatPaymentSchema = zod_1.z.object({
    razorpay_order_id: zod_1.z.string(),
    razorpay_payment_id: zod_1.z.string(),
    razorpay_signature: zod_1.z.string(),
    bookingData: exports.chatBookingSchema,
});
