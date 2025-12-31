"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateServiceSchema = exports.addServiceSchema = exports.providerIdParamSchema = exports.serviceIdParamSchema = void 0;
const zod_1 = require("zod");
const Services_enum_1 = require("../../enums/Services.enum");
const paramIdSchema = zod_1.z.string().min(1, "ID is required");
exports.serviceIdParamSchema = zod_1.z.object({
    id: paramIdSchema,
});
exports.providerIdParamSchema = zod_1.z.object({
    providerId: paramIdSchema,
});
const serviceBodySchema = zod_1.z.object({
    title: zod_1.z.string().min(3, "Title must be at least 3 characters long."),
    description: zod_1.z.string(),
    categoryId: paramIdSchema,
    subCategoryId: paramIdSchema,
    priceUnit: zod_1.z.nativeEnum(Services_enum_1.ServicesPriceUnit),
    duration: zod_1.z.string(),
    status: zod_1.z.coerce.boolean().optional(),
    price: zod_1.z.coerce.number().positive("Price must be a positive number."),
    experience: zod_1.z.coerce.number().int().positive("Experience must be a positive integer."),
});
exports.addServiceSchema = serviceBodySchema;
exports.updateServiceSchema = serviceBodySchema.partial();
