"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAddressSchema = exports.createAddressSchema = exports.paramIdSchema = void 0;
const zod_1 = require("zod");
exports.paramIdSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, "ID is required"),
});
exports.createAddressSchema = zod_1.z.object({
    label: zod_1.z.string().min(1, "Label is required."),
    street: zod_1.z.string().min(1, "Street is required."),
    city: zod_1.z.string().min(1, "City is required."),
    state: zod_1.z.string().min(1, "State is required."),
    zip: zod_1.z.string().min(5, "A valid ZIP code is required."),
    locationCoords: zod_1.z.string(),
});
exports.updateAddressSchema = zod_1.z.object({
    label: zod_1.z.string().min(1, "Label is required.").optional(),
    street: zod_1.z.string().min(1, "Street is required.").optional(),
    city: zod_1.z.string().min(1, "City is required.").optional(),
    state: zod_1.z.string().min(1, "State is required.").optional(),
    zip: zod_1.z.string().min(5, "A valid ZIP code is required.").optional(),
    locationCoords: zod_1.z.string().optional(),
});
