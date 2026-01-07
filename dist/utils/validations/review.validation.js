import { z } from "zod";
import { ReviewStatus } from "../../enums/review.enum";
export const updateReviewStatusSchema = z.object({
    status: z.nativeEnum(ReviewStatus),
});
export const addReviewSchema = z.object({
    bookingId: z.string().min(1, "ID is required"),
    rating: z.coerce.number().int().min(1, "Rating must be at least 1.").max(5, "Rating cannot be more than 5."),
    review: z.string().min(10, "Review must be at least 10 characters long.").optional(),
});
export const getReviewsQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    sort: z.enum(["newest", "oldest"]).optional(),
    status: z
        .nativeEnum(ReviewStatus)
        .optional()
        .transform((val) => (val === ReviewStatus.ALL ? undefined : val)),
});
