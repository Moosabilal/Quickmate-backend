var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { inject, injectable } from "inversify";
import {} from "../services/interface/IReviewService.js";
import TYPES from "../di/type.js";
import {} from "../middleware/authMiddleware.js";
import {} from "express-serve-static-core";
import {} from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode.js";
import {} from "../interface/review.js";
import { ZodError } from "zod";
import { addReviewSchema, getReviewsQuerySchema, updateReviewStatusSchema, } from "../utils/validations/review.validation.js";
import { paramIdSchema } from "../utils/validations/booking.validation.js";
let ReviewController = class ReviewController {
    _reviewService;
    constructor(reviewService) {
        this._reviewService = reviewService;
    }
    addReview = async (req, res, next) => {
        try {
            const { bookingId, rating, review } = addReviewSchema.parse(req.body);
            const response = await this._reviewService.addReview(bookingId, rating, review);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            if (error instanceof ZodError) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            }
            next(error);
        }
    };
    getAllReviewsForAdmin = async (req, res, next) => {
        try {
            const { page = 1, limit = 10, ...queryFilters } = getReviewsQuerySchema.parse(req.query);
            const filters = {
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
        }
        catch (error) {
            if (error instanceof ZodError) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            }
            next(error);
        }
    };
    updateReviewStatus = async (req, res, next) => {
        try {
            const { id } = paramIdSchema.parse(req.params);
            const { status } = updateReviewStatusSchema.parse(req.body);
            const updatedReview = await this._reviewService.updateReviewStatus(id, status);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: "Review status updated successfully",
                data: updatedReview,
            });
        }
        catch (error) {
            if (error instanceof ZodError) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                return;
            }
            next(error);
        }
    };
};
ReviewController = __decorate([
    injectable(),
    __param(0, inject(TYPES.ReviewService)),
    __metadata("design:paramtypes", [Object])
], ReviewController);
export { ReviewController };
