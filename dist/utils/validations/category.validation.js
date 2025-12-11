"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubcategoriesQuerySchema = exports.paramIdSchema = exports.updateCategorySchema = exports.createCategorySchema = void 0;
const zod_1 = require("zod");
const CommissionType_enum_1 = require("../../enums/CommissionType.enum");
const categoryBaseSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Category name is required."),
    description: zod_1.z.string().optional(),
    status: zod_1.z
        .union([zod_1.z.boolean(), zod_1.z.string()])
        .transform(val => {
        if (typeof val === "boolean")
            return val;
        if (val.toLowerCase() === "true")
            return true;
        if (val.toLowerCase() === "false")
            return false;
        return Boolean(val);
    })
        .optional(),
    parentId: zod_1.z.string().min(1, "ID is required").nullable().optional(),
    commissionType: zod_1.z.nativeEnum(CommissionType_enum_1.CommissionTypes),
    commissionValue: zod_1.z.coerce.number().min(0, "Commission cannot be negative.").max(100, "Commission cannot exceed 100.").optional(),
    commissionStatus: zod_1.z
        .union([zod_1.z.boolean(), zod_1.z.string()])
        .transform(val => {
        if (typeof val === "boolean")
            return val;
        if (val.toLowerCase() === "true")
            return true;
        if (val.toLowerCase() === "false")
            return false;
        return Boolean(val);
    }),
});
exports.createCategorySchema = categoryBaseSchema;
exports.updateCategorySchema = categoryBaseSchema.partial();
exports.paramIdSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, "ID is required"),
});
exports.getSubcategoriesQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().optional(),
    search: zod_1.z.string().optional(),
});
