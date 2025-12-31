"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyDepositSchema = exports.initiateDepositSchema = exports.getWalletQuerySchema = void 0;
const zod_1 = require("zod");
const payment_wallet_enum_1 = require("../../enums/payment&wallet.enum");
exports.getWalletQuerySchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(payment_wallet_enum_1.TransactionStatus).optional(),
    startDate: zod_1.z.string().datetime({ message: "Invalid date format, expected ISO 8601" }).optional(),
    transactionType: zod_1.z.enum(['credit', 'debit', '']).optional(),
    page: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().optional(),
});
exports.initiateDepositSchema = zod_1.z.object({
    amount: zod_1.z.coerce.number().positive("Amount must be a positive number."),
});
exports.verifyDepositSchema = zod_1.z.object({
    razorpay_order_id: zod_1.z.string(),
    razorpay_payment_id: zod_1.z.string(),
    razorpay_signature: zod_1.z.string(),
    amount: zod_1.z.coerce.number().positive(),
    description: zod_1.z.string(),
    status: zod_1.z.nativeEnum(payment_wallet_enum_1.TransactionStatus),
    transactionType: zod_1.z.enum(["credit", "debit"]),
});
