import { z } from 'zod';
import { ProviderStatus } from '../../enums/provider.enum';

const IdSchema = z.string().min(1, "ID is required");
export const paramIdSchema = z.object({ id: IdSchema });


export const registerProviderSchema = z.object({
    fullName: z.string().min(2, "Full name is required."),
    phoneNumber: z.string().min(10, "A valid phone number is required."),
    email: z.string()
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid email address")
    .max(50, "Email address is too long")
    .refine((val) => val.split('@')[0].length >= 3, {
        message: "Email address is too short",
    }),
    serviceArea: z.string().min(3, "Service area is required."),
    serviceLocation: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, "Invalid location format."),
});

export const updateProviderSchema = registerProviderSchema.partial();

export const updateProviderStatusSchema = z.object({
    newStatus: z.nativeEnum(ProviderStatus),
    reason: z.string().optional()
});


export const providersForAdminQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    status: z.string().optional()
        .transform(val => (val === 'undefined' || val === 'All') ? undefined : val)
        .pipe(z.nativeEnum(ProviderStatus).optional()),
    rating: z
        .union([
            z.coerce.number().int().min(1).max(5),
            z.literal('undefined'),
            z.literal('All'),
        ])
        .optional()
        .transform((val) => (val === 'undefined' || val === 'All') ? undefined : val),
});

export const getServiceProviderQuerySchema = z.object({
    serviceId: IdSchema,
    experience: z.coerce.number().positive().optional(),

    radius: z.coerce.number().positive().optional(),

    price: z.coerce.number().positive().optional(),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
    time: z.string().optional(),
});

export const getAvailabilityQuerySchema = z.object({
    serviceId: IdSchema,
    latitude: z.coerce.number(),
    longitude: z.coerce.number(),
    radius: z.coerce.number().int().positive().optional(),
    timeMin: z.string().datetime(),
    timeMax: z.string().datetime(),
});

export const getEarningsQuerySchema = z.object({
    period: z.enum(['week', 'month']).optional().default('week'),
});

export const featuredProvidersQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
});

const timeSlotSchema = z.object({
    start: z.string(),
    end: z.string(),
});

const dayScheduleSchema = z.object({
    day: z.string(),
    active: z.boolean(),
    slots: z.array(timeSlotSchema),
});

const dateOverrideSchema = z.object({
    date: z.string(),
    isUnavailable: z.boolean(),
    busySlots: z.array(timeSlotSchema),
    reason: z.string().optional(),
});

const leavePeriodSchema = z.object({
    from: z.string(),
    to: z.string(),
    reason: z.string().optional(),
});

export const updateAvailabilitySchema = z.object({
    weeklySchedule: z.array(dayScheduleSchema),
    dateOverrides: z.array(dateOverrideSchema),
    leavePeriods: z.array(leavePeriodSchema),
});

export const searchQuerySchema = z.object({
    search: z.string().optional(),
});