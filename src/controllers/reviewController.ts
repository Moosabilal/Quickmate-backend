import { inject, injectable } from "inversify";
import { IReviewService } from "../services/interface/IReviewService";
import TYPES from "../di/type";
import { AuthRequest } from "../middleware/authMiddleware";
import { NextFunction } from "express-serve-static-core";
import { response, Response } from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { IReviewFilters } from "../interface/review";
import { ZodError } from "zod";
import { addReviewSchema, getReviewsQuerySchema } from "../utils/validations/review.validation";

@injectable()
export class ReviewController {
    private _reviewService: IReviewService;
    constructor(@inject(TYPES.ReviewService) reviewService: IReviewService){
        this._reviewService = reviewService
    }

    public addReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { bookingId, rating, review } = addReviewSchema.parse(req.body);
            const response = await this._reviewService.addReview(bookingId, rating, review)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            }
            next(error)
        }
    }

    public getAllReviewsForAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { page = 1, limit = 10, ...queryFilters } = getReviewsQuerySchema.parse(req.query);

            const filters: IReviewFilters = {
                page,
                limit,
                ...queryFilters
            };

            const { reviews, total } = await this._reviewService.getPaginatedReviews(filters);

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: "Reviews fetched successfully",
                data: reviews,
                pagination: {
                    total,
                    page: filters.page,
                    limit: filters.limit,
                    totalPages: Math.ceil(total / filters.limit)
                }
            });
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            }
            next(error);
        }
    }
}