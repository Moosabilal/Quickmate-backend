import { z } from 'zod';
import { ProviderStatus } from '../../enums/provider.enum'; // Adjust import path

const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');
export const mongoIdParamSchema = z.object({ id: mongoIdSchema });


export const registerProviderSchema = z.object({
    fullName: z.string().min(2, "Full name is required."),
    phoneNumber: z.string().min(10, "A valid phone number is required."),
    email: z.string().email(),
    serviceArea: z.string().min(3, "Service area is required."),
    serviceLocation: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, "Invalid location format."),
});

export const updateProviderSchema = registerProviderSchema.partial();

export const updateProviderStatusSchema = z.object({
    newStatus: z.nativeEnum(ProviderStatus),
});


export const providersForAdminQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    status: z.string().optional()
        .transform(val => (val === 'undefined' || val === 'All') ? undefined : val)
        .pipe(z.nativeEnum(ProviderStatus).optional()),
});

export const getServiceProviderQuerySchema = z.object({
    serviceId: mongoIdSchema,
    experience: z.coerce.number().positive().optional(),
    radiusKm: z.coerce.number().positive().optional(),
    price: z.coerce.number().positive().optional(),
    latitude: z.coerce.number(),
    longitude: z.coerce.number(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
    time: z.string().optional(),
});

export const getAvailabilityQuerySchema = z.object({
    serviceId: mongoIdSchema,
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

// --- ADD THIS SCHEMA for updateAvailability ---
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