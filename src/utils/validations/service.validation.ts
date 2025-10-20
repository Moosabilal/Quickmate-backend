import { z } from 'zod';
import { ServicesPriceUnit } from '../../enums/Services.enum'; // Adjust import path

// Reusable schema for validating MongoDB ObjectIds
const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

// --- Schemas for URL Parameters ---
export const serviceIdParamSchema = z.object({
    id: mongoIdSchema,
});
export const providerIdParamSchema = z.object({
    providerId: mongoIdSchema,
});

// --- Schema for the Service Body ---
// This will be used for both creating and updating
const serviceBodySchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters long."),
    description: z.string(),
    categoryId: mongoIdSchema,
    subCategoryId: mongoIdSchema,
    priceUnit: z.nativeEnum(ServicesPriceUnit),
    duration: z.string(),
    // Use z.coerce to automatically convert "true"/"false" strings to booleans
    status: z.coerce.boolean().optional(),
    // Use z.coerce to automatically convert string numbers to actual numbers
    price: z.coerce.number().positive("Price must be a positive number."),
    experience: z.coerce.number().int().positive("Experience must be a positive integer."),
});

// Schema for Creating a Service (all fields from body schema are required)
export const addServiceSchema = serviceBodySchema;

// Schema for Updating a Service (.partial() makes all fields optional)
export const updateServiceSchema = serviceBodySchema.partial();