import { z } from 'zod';
import { BookingStatus } from '../../enums/booking.enum'; // Adjust import path
import { PaymentMethod } from '../../enums/userRoles';

// Reusable schema for validating MongoDB ObjectIds in URL parameters
export const mongoIdParamSchema = z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
});

// Schema for creating a new booking
export const createBookingSchema = z.object({
    providerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Provider ID'),
    serviceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Service ID'),
    addressId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Address ID'),
    customerName: z.string().min(2, "Customer name is required."),
    phone: z.string().min(10, "A valid phone number is required."),
    amount: z.coerce.number().positive("Amount must be a positive number."),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD'),
    scheduledTime: z.string().regex(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/, 'Invalid time format. Expected hh:mm AM/PM'),
    instructions: z.string().optional(),
});

// Schema for confirming a payment before verification
export const confirmPaymentSchema = z.object({
    amount: z.number().positive("Amount must be a positive number."),
});

// Schema for verifying a payment (e.g., with Razorpay)
export const verifyPaymentSchema = z.object({
    razorpay_order_id: z.string(),
    razorpay_payment_id: z.string().optional(),  // optional for wallet payments
    razorpay_signature: z.string().optional(),   // optional for wallet payments
    bookingId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Booking ID'),

    // Add these missing fields
    providerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Provider ID'),
    paymentMethod: z.nativeEnum(PaymentMethod),
    paymentDate: z.coerce.date(), // allow ISO date or Date object
    amount: z.number().positive(),
});

// Schema for updating a booking's status
export const updateBookingStatusSchema = z.object({
    // Remove the second argument from z.nativeEnum
    status: z.nativeEnum(BookingStatus),
});

// Schema for updating a booking's date and time
export const updateBookingDateTimeSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD'),
    time: z.string().regex(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/, 'Invalid time format. Expected hh:mm AM/PM'),
});

// Schema for verifying a booking-related OTP
export const verifyBookingOtpSchema = z.object({
    // Add the email validation here
    email: z.string().email("A valid email is required."),
    otp: z.string().length(6, "OTP must be 6 digits."),
});

// Schema for validating admin query parameters for fetching all bookings
export const adminBookingsQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    bookingStatus: z.nativeEnum(BookingStatus).optional(),
    serviceType: z.string().optional(),
    dateRange: z.string().optional(),
});

// Schema for validating query parameters for finding providers in a range
export const findProviderRangeSchema = z.object({
    serviceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Service ID'),
    lat: z.coerce.number(),
    lng: z.coerce.number(),
    radius: z.coerce.number().positive(),
});