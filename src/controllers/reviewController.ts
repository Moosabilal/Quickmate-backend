import { inject, injectable } from "inversify";
import { type IReviewService } from "../services/interface/IReviewService";
import TYPES from "../di/type";
import { type AuthRequest } from "../middleware/authMiddleware";
import { type NextFunction } from "express-serve-static-core";
import { type Response } from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { type IReviewFilters } from "../interface/review";
import { ZodError } from "zod";
import {
  addReviewSchema,
  getReviewsQuerySchema,
  updateReviewStatusSchema,
} from "../utils/validations/review.validation";
import { paramIdSchema } from "../utils/validations/booking.validation";

@injectable()
export class ReviewController {
  private _reviewService: IReviewService;
  constructor(@inject(TYPES.ReviewService) reviewService: IReviewService) {
    this._reviewService = reviewService;
  }

  public addReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { bookingId, rating, review } = addReviewSchema.parse(req.body);
      const response = await this._reviewService.addReview(bookingId, rating, review);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
      }
      next(error);
    }
  };

  public getAllReviewsForAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 10, ...queryFilters } = getReviewsQuerySchema.parse(req.query);

      const filters: IReviewFilters = {
        page,
        limit,
        ...queryFilters,
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
          totalPages: Math.ceil(total / filters.limit),
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
      }
      next(error);
    }
  };

  public updateReviewStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = paramIdSchema.parse(req.params);
      const { status } = updateReviewStatusSchema.parse(req.body);

      const updatedReview = await this._reviewService.updateReviewStatus(id, status);

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: "Review status updated successfully",
        data: updatedReview,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
        return;
      }
      next(error);
    }
  };
}
