import { inject, injectable } from "inversify";
import { IReviewService } from "../services/interface/IReviewService";
import TYPES from "../di/type";
import { AuthRequest } from "../middleware/authMiddleware";
import { NextFunction } from "express-serve-static-core";
import { response, Response } from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { IReviewFilters } from "../interface/review";

@injectable()
export class ReviewController {
    private _reviewService: IReviewService;
    constructor(@inject(TYPES.ReviewService) reviewService: IReviewService){
        this._reviewService = reviewService
    }

    public addReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const {bookingId, rating, review} = req.body
            const response = await this._reviewService.addReview(bookingId, rating, review)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getAllReviewsForAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const filters: IReviewFilters = {
                page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
                search: req.query.search as string | undefined,
                rating: req.query.rating ? parseInt(req.query.rating as string, 10) : undefined,
                sort: req.query.sort as 'newest' | 'oldest' | undefined,
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
            next(error);
        }
    }
}