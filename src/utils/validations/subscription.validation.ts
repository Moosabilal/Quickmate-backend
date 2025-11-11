import { z } from 'zod';

export const mongoIdParamSchema = z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
});

export const providerIdParamSchema = z.object({
    providerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Provider ID format'),
});


export const createSubscriptionPlanSchema = z.object({
    name: z.string().min(3, "Plan name must be at least 3 characters long."),
    price: z.coerce.number().positive("Price must be a positive number."),
    durationInDays: z.coerce.number().int().positive("Duration must be a positive whole number."),
    features: z.array(z.string().min(1, "Feature description cannot be empty.")).min(1, "At least one feature is required."),
});

export const updateSubscriptionPlanSchema = z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Plan ID format'),
    name: z.string().min(3).optional(),
    price: z.coerce.number().positive().optional(),
    durationInDays: z.coerce.number().int().positive().optional(),
    features: z.array(z.string().min(1)).min(1).optional(),
});

export const createSubscriptionOrderSchema = z.object({
    providerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Provider ID'),
    planId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Plan ID'),
});

export const verifySubscriptionPaymentSchema = z.object({
    providerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Provider ID'),
    planId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Plan ID'),
    razorpay_order_id: z.string(),
    razorpay_payment_id: z.string(),
    razorpay_signature: z.string(),
});

export const getSubscriptionPlanQuerySchema = z.object({
    search: z.string().optional(),
});

export const calculateUpgradeSchema = z.object({
    newPlanId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Plan ID'),
});