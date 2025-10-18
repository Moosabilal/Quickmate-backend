import { z } from 'zod';
import { ProviderStatus } from '../../enums/provider.enum'; // Adjust import path

// --- Reusable Schemas ---
const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');
export const mongoIdParamSchema = z.object({ id: mongoIdSchema });

// A schema for a single availability slot
const availabilitySchema = z.object({
    day: z.string(),
    startTime: z.string(),
    endTime: z.string(),
});

// --- Body Schemas ---

// Schema for Provider Registration (handles JSON strings in form-data)
export const registerProviderSchema = z.object({
    fullName: z.string().min(2, "Full name is required."),
    phoneNumber: z.string().min(10, "A valid phone number is required."),
    email: z.string().email(),
    serviceArea: z.string().min(3, "Service area is required."),
    serviceLocation: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, "Invalid location format."),
    // Use .transform() to parse JSON strings from FormData
    availability: z.string().transform((val) => JSON.parse(val)).pipe(z.array(availabilitySchema)),
});

// Schema for Provider Updates (.partial() makes all fields optional)
export const updateProviderSchema = registerProviderSchema.partial();

// Schema for updating a provider's status
export const updateProviderStatusSchema = z.object({
    newStatus: z.nativeEnum(ProviderStatus),
});

// --- Query Schemas ---

// Schema for admin-side provider list queries
export const providersForAdminQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    status: z.string().optional(), // Can refine with z.nativeEnum if status values are consistent
});

// Schema for finding service providers with filters
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

// Schema for getting provider availability
export const getAvailabilityQuerySchema = z.object({
    serviceId: mongoIdSchema,
    latitude: z.coerce.number(),
    longitude: z.coerce.number(),
    radius: z.coerce.number().int().positive().optional(),
    timeMin: z.string().datetime(), // Validates ISO 8601 date-time string
    timeMax: z.string().datetime(),
});

// Schema for earnings analytics query
export const getEarningsQuerySchema = z.object({
    period: z.enum(['week', 'month']).optional().default('week'),
});