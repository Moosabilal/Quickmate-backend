import { z } from 'zod';
import { CommissionTypes } from '../../enums/CommissionType.enum'; // Adjust import path

// --- Base Schema for Category and Commission ---
// This contains all possible fields for creating/updating a category
const categoryBaseSchema = z.object({
    name: z.string().min(1, "Category name is required."),
    description: z.string().optional(),
    // Coerce converts string "true"/"false" from form-data into a boolean
    status: z
  .union([z.boolean(), z.string()])
  .transform(val => {
    if (typeof val === "boolean") return val;
    if (val.toLowerCase() === "true") return true;
    if (val.toLowerCase() === "false") return false;
    return Boolean(val); // fallback
  })
  .optional(),
    parentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Parent ID format').nullable().optional(),
    commissionType: z.nativeEnum(CommissionTypes),
    // Coerce converts string numbers from form-data into a number
    commissionValue: z.coerce.number().min(0, "Commission cannot be negative.").max(100, "Commission cannot exceed 100.").optional(),
    commissionStatus: z
  .union([z.boolean(), z.string()])
  .transform(val => {
    if (typeof val === "boolean") return val;
    if (val.toLowerCase() === "true") return true;
    if (val.toLowerCase() === "false") return false;
    return Boolean(val); // fallback
  }),
});

// --- Schema for Creating a Category ---
// We can be stricter here if needed, but the base schema is often sufficient
export const createCategorySchema = categoryBaseSchema;

// --- Schema for Updating a Category ---
// .partial() makes all fields in the base schema optional
export const updateCategorySchema = categoryBaseSchema.partial();

// --- Schema for Validating URL Parameters with an ID ---
export const mongoIdParamSchema = z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
});

// --- Schema for Validating Query Parameters for Subcategories ---
export const getSubcategoriesQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
});