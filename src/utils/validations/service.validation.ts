import { z } from 'zod';
import { ServicesPriceUnit } from '../../enums/Services.enum'; 

const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

export const serviceIdParamSchema = z.object({
    id: mongoIdSchema,
});
export const providerIdParamSchema = z.object({
    providerId: mongoIdSchema,
});

const serviceBodySchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters long."),
    description: z.string(),
    categoryId: mongoIdSchema,
    subCategoryId: mongoIdSchema,
    priceUnit: z.nativeEnum(ServicesPriceUnit),
    duration: z.string(),
    status: z.coerce.boolean().optional(),
    price: z.coerce.number().positive("Price must be a positive number."),
    experience: z.coerce.number().int().positive("Experience must be a positive integer."),
});

export const addServiceSchema = serviceBodySchema;

export const updateServiceSchema = serviceBodySchema.partial();