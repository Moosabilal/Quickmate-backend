"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReviewsQuerySchema = exports.addReviewSchema = exports.updateReviewStatusSchema = void 0;
const zod_1 = require("zod");
const review_enum_1 = require("../../enums/review.enum");
exports.updateReviewStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(review_enum_1.ReviewStatus),
});
exports.addReviewSchema = zod_1.z.object({
    bookingId: zod_1.z.string().min(1, "ID is required"),
    rating: zod_1.z.coerce.number().int().min(1, "Rating must be at least 1.").max(5, "Rating cannot be more than 5."),
    review: zod_1.z.string().min(10, "Review must be at least 10 characters long.").optional(),
});
exports.getReviewsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().optional(),
    search: zod_1.z.string().optional(),
    rating: zod_1.z.coerce.number().int().min(1).max(5).optional(),
    sort: zod_1.z.enum(['newest', 'oldest']).optional(),
    status: zod_1.z.nativeEnum(review_enum_1.ReviewStatus).optional()
        .transform(val => (val === review_enum_1.ReviewStatus.ALL ? undefined : val)),
});
