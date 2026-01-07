import { z } from "zod";
import { TransactionStatus } from "../../enums/payment&wallet.enum";
export const getWalletQuerySchema = z.object({
    status: z.nativeEnum(TransactionStatus).optional(),
    startDate: z.string().datetime({ message: "Invalid date format, expected ISO 8601" }).optional(),
    transactionType: z.enum(["credit", "debit", ""]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
});
export const initiateDepositSchema = z.object({
    amount: z.coerce.number().positive("Amount must be a positive number."),
});
export const verifyDepositSchema = z.object({
    razorpay_order_id: z.string(),
    razorpay_payment_id: z.string(),
    razorpay_signature: z.string(),
    amount: z.coerce.number().positive(),
    description: z.string(),
    status: z.nativeEnum(TransactionStatus),
    transactionType: z.enum(["credit", "debit"]),
});
