import { z } from 'zod';
import { CommissionTypes } from '../../enums/CommissionType.enum';

const categoryBaseSchema = z.object({
    name: z.string().min(1, "Category name is required."),
    description: z.string().optional(),
    status: z
  .union([z.boolean(), z.string()])
  .transform(val => {
    if (typeof val === "boolean") return val;
    if (val.toLowerCase() === "true") return true;
    if (val.toLowerCase() === "false") return false;
    return Boolean(val); 
  })
  .optional(),
    parentId: z.string().min(1, "ID is required").nullable().optional(),
    commissionType: z.nativeEnum(CommissionTypes),
    commissionValue: z.coerce.number().min(0, "Commission cannot be negative.").max(100, "Commission cannot exceed 100.").optional(),
    commissionStatus: z
  .union([z.boolean(), z.string()])
  .transform(val => {
    if (typeof val === "boolean") return val;
    if (val.toLowerCase() === "true") return true;
    if (val.toLowerCase() === "false") return false;
    return Boolean(val);
  }),
});

export const createCategorySchema = categoryBaseSchema;

export const updateCategorySchema = categoryBaseSchema.partial();

export const paramIdSchema = z.object({
    id: z.string().min(1, "ID is required"),
});

export const getSubcategoriesQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
});