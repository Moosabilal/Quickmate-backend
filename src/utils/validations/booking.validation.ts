import { z } from 'zod';
import { BookingStatus } from '../../enums/booking.enum'; 
import { PaymentMethod } from '../../enums/userRoles';

export const paramIdSchema = z.object({
    id: z.string().min(1, "ID is required"),
});

export const createBookingSchema = z.object({
    providerId: z.string().min(1, "ID is required"),
    serviceId: z.string().min(1, "ID is required"),
    addressId: z.string().min(1, "ID is required"),
    customerName: z.string().min(2, "Customer name is required."),
    phone: z.string().min(10, "A valid phone number is required."),
    amount: z.coerce.number().positive("Amount must be a positive number."),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD'),
    scheduledTime: z.string().regex(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/, 'Invalid time format. Expected hh:mm AM/PM'),
    instructions: z.string().optional(),
});

export const confirmPaymentSchema = z.object({
    amount: z.number().positive("Amount must be a positive number."),
});

export const verifyPaymentSchema = z.object({
    razorpay_order_id: z.string(),
    razorpay_payment_id: z.string().optional(), 
    razorpay_signature: z.string().optional(),  
    bookingId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Booking ID'),

    providerId: z.string().min(1, "ID is required"),
    paymentMethod: z.nativeEnum(PaymentMethod),
    paymentDate: z.coerce.date(), 
    amount: z.number().positive(),
});

export const updateBookingStatusSchema = z.object({
    status: z.nativeEnum(BookingStatus),
});

export const updateBookingDateTimeSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD'),
    time: z.string().regex(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/, 'Invalid time format. Expected hh:mm AM/PM'),
});

export const verifyBookingOtpSchema = z.object({
    email: z.string().email("A valid email is required."),
    otp: z.string().length(6, "OTP must be 6 digits."),
});

export const adminBookingsQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    bookingStatus: z.nativeEnum(BookingStatus).optional(),
    dateRange: z.string().optional(),
});

export const findProviderRangeSchema = z.object({
    serviceId: z.string().min(1, "ID is required"),
    lat: z.coerce.number(),
    lng: z.coerce.number(),
    radius: z.coerce.number().positive(),
});

export const bookingFilterSchema = z.object({
    search: z.string().optional(),
    status: z.nativeEnum(BookingStatus).optional()
        .transform(val => (val === BookingStatus.All) ? undefined : val),
});

export const providerBookingsQuerySchema = bookingFilterSchema.extend({
    providerId: z.string().min(1, "ID is required"),
});

export const chatBookingSchema = createBookingSchema.extend({
  userId: z.string().optional(),
});

export const verifyChatPaymentSchema = z.object({
    razorpay_order_id: z.string(),
    razorpay_payment_id: z.string(), 
    razorpay_signature: z.string(),
    bookingData: chatBookingSchema, 
});