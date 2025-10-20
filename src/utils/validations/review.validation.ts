import { z } from 'zod';

/**
 * @description Schema for validating the body when a user adds a new review.
 */
export const addReviewSchema = z.object({
    bookingId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'A valid booking ID is required.'),
    rating: z.coerce.number().int().min(1, "Rating must be at least 1.").max(5, "Rating cannot be more than 5."),
    review: z.string().min(10, "Review must be at least 10 characters long.").optional(),
});

/**
 * @description Schema for validating the query parameters for the admin review list.
 */
export const getReviewsQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    sort: z.enum(['newest', 'oldest']).optional(),
});