import { z } from "zod";
import { ServicesPriceUnit } from "../../enums/Services.enum";
const paramIdSchema = z.string().min(1, "ID is required");
export const serviceIdParamSchema = z.object({
    id: paramIdSchema,
});
export const providerIdParamSchema = z.object({
    providerId: paramIdSchema,
});
const serviceBodySchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters long."),
    description: z.string(),
    categoryId: paramIdSchema,
    subCategoryId: paramIdSchema,
    priceUnit: z.nativeEnum(ServicesPriceUnit),
    duration: z.string(),
    status: z.coerce.boolean().optional(),
    price: z.coerce.number().positive("Price must be a positive number."),
    experience: z.coerce.number().int().positive("Experience must be a positive integer."),
});
export const addServiceSchema = serviceBodySchema;
export const updateServiceSchema = serviceBodySchema.partial();
