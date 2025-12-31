"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchQuerySchema = exports.updateAvailabilitySchema = exports.featuredProvidersQuerySchema = exports.getEarningsQuerySchema = exports.getAvailabilityQuerySchema = exports.getServiceProviderQuerySchema = exports.providersForAdminQuerySchema = exports.updateProviderStatusSchema = exports.updateProviderSchema = exports.registerProviderSchema = exports.paramIdSchema = void 0;
const zod_1 = require("zod");
const provider_enum_1 = require("../../enums/provider.enum");
const IdSchema = zod_1.z.string().min(1, "ID is required");
exports.paramIdSchema = zod_1.z.object({ id: IdSchema });
exports.registerProviderSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2, "Full name is required."),
    phoneNumber: zod_1.z.string().min(10, "A valid phone number is required."),
    email: zod_1.z.string().email(),
    serviceArea: zod_1.z.string().min(3, "Service area is required."),
    serviceLocation: zod_1.z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, "Invalid location format."),
});
exports.updateProviderSchema = exports.registerProviderSchema.partial();
exports.updateProviderStatusSchema = zod_1.z.object({
    newStatus: zod_1.z.nativeEnum(provider_enum_1.ProviderStatus),
    reason: zod_1.z.string().optional()
});
exports.providersForAdminQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().optional(),
    search: zod_1.z.string().optional(),
    status: zod_1.z.string().optional()
        .transform(val => (val === 'undefined' || val === 'All') ? undefined : val)
        .pipe(zod_1.z.nativeEnum(provider_enum_1.ProviderStatus).optional()),
    rating: zod_1.z
        .union([
        zod_1.z.coerce.number().int().min(1).max(5),
        zod_1.z.literal('undefined'),
        zod_1.z.literal('All'),
    ])
        .optional()
        .transform((val) => (val === 'undefined' || val === 'All') ? undefined : val),
});
exports.getServiceProviderQuerySchema = zod_1.z.object({
    serviceId: IdSchema,
    experience: zod_1.z.coerce.number().positive().optional(),
    radius: zod_1.z.coerce.number().positive().optional(),
    price: zod_1.z.coerce.number().positive().optional(),
    latitude: zod_1.z.coerce.number().optional(),
    longitude: zod_1.z.coerce.number().optional(),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
    time: zod_1.z.string().optional(),
});
exports.getAvailabilityQuerySchema = zod_1.z.object({
    serviceId: IdSchema,
    latitude: zod_1.z.coerce.number(),
    longitude: zod_1.z.coerce.number(),
    radius: zod_1.z.coerce.number().int().positive().optional(),
    timeMin: zod_1.z.string().datetime(),
    timeMax: zod_1.z.string().datetime(),
});
exports.getEarningsQuerySchema = zod_1.z.object({
    period: zod_1.z.enum(['week', 'month']).optional().default('week'),
});
exports.featuredProvidersQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().optional(),
    search: zod_1.z.string().optional(),
});
const timeSlotSchema = zod_1.z.object({
    start: zod_1.z.string(),
    end: zod_1.z.string(),
});
const dayScheduleSchema = zod_1.z.object({
    day: zod_1.z.string(),
    active: zod_1.z.boolean(),
    slots: zod_1.z.array(timeSlotSchema),
});
const dateOverrideSchema = zod_1.z.object({
    date: zod_1.z.string(),
    isUnavailable: zod_1.z.boolean(),
    busySlots: zod_1.z.array(timeSlotSchema),
    reason: zod_1.z.string().optional(),
});
const leavePeriodSchema = zod_1.z.object({
    from: zod_1.z.string(),
    to: zod_1.z.string(),
    reason: zod_1.z.string().optional(),
});
exports.updateAvailabilitySchema = zod_1.z.object({
    weeklySchedule: zod_1.z.array(dayScheduleSchema),
    dateOverrides: zod_1.z.array(dateOverrideSchema),
    leavePeriods: zod_1.z.array(leavePeriodSchema),
});
exports.searchQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
});
