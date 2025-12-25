"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateUpgradeSchema = exports.getSubscriptionPlanQuerySchema = exports.verifySubscriptionPaymentSchema = exports.createSubscriptionOrderSchema = exports.updateSubscriptionPlanSchema = exports.createSubscriptionPlanSchema = exports.providerIdParamSchema = exports.paramIdSchema = void 0;
const zod_1 = require("zod");
exports.paramIdSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, "ID is required"),
});
exports.providerIdParamSchema = zod_1.z.object({
    providerId: zod_1.z.string().min(1, "ID is required"),
});
exports.createSubscriptionPlanSchema = zod_1.z.object({
    name: zod_1.z.string().min(3, "Plan name must be at least 3 characters long."),
    description: zod_1.z.string().optional(),
    price: zod_1.z.coerce.number().positive("Price must be a positive number."),
    durationInDays: zod_1.z.coerce.number().int().positive("Duration must be a positive whole number."),
    features: zod_1.z.array(zod_1.z.string().min(1, "Feature description cannot be empty.")).min(1, "At least one feature is required."),
});
exports.updateSubscriptionPlanSchema = zod_1.z.object({
    id: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Plan ID format'),
    name: zod_1.z.string().min(3).optional(),
    description: zod_1.z.string().optional(),
    price: zod_1.z.coerce.number().positive().optional(),
    durationInDays: zod_1.z.coerce.number().int().positive().optional(),
    features: zod_1.z.array(zod_1.z.string().min(1)).min(1).optional(),
});
exports.createSubscriptionOrderSchema = zod_1.z.object({
    providerId: zod_1.z.string().min(1, "ID is required"),
    planId: zod_1.z.string().min(1, "ID is required"),
});
exports.verifySubscriptionPaymentSchema = zod_1.z.object({
    providerId: zod_1.z.string().min(1, "ID is required"),
    planId: zod_1.z.string().min(1, "ID is required"),
    razorpay_order_id: zod_1.z.string(),
    razorpay_payment_id: zod_1.z.string(),
    razorpay_signature: zod_1.z.string(),
});
exports.getSubscriptionPlanQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
});
exports.calculateUpgradeSchema = zod_1.z.object({
    newPlanId: zod_1.z.string().min(1, "ID is required"),
});
