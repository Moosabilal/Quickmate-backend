import { z } from 'zod';
import { TransactionStatus } from '../../enums/payment&wallet.enum'; // Adjust import path

/**
 * @description Schema for validating the query parameters when fetching wallet history.
 */
export const getWalletQuerySchema = z.object({
    // Use .nativeEnum to validate against your TypeScript enum
    status: z.nativeEnum(TransactionStatus).optional(),
    // Use .datetime() to ensure the date string is in ISO 8601 format
    startDate: z.string().datetime({ message: "Invalid date format, expected ISO 8601" }).optional(),
    transactionType: z.enum(['credit', 'debit', '']).optional(),
    // Use z.coerce to automatically convert string numbers from query params
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
});

/**
 * @description Schema for validating the body when initiating a deposit.
 */
export const initiateDepositSchema = z.object({
    amount: z.coerce.number().positive("Amount must be a positive number."),
});

/**
 * @description Schema for validating the payment gateway response when verifying a deposit.
 */
export const verifyDepositSchema = z.object({
    razorpay_order_id: z.string(),
    razorpay_payment_id: z.string(),
    razorpay_signature: z.string(),
    // --- ADD THE MISSING FIELDS HERE ---
    amount: z.coerce.number().positive(),
    description: z.string(),
    status: z.nativeEnum(TransactionStatus),
    transactionType: z.enum(["credit", "debit"]), // For a deposit, this should always be 'credit'
});