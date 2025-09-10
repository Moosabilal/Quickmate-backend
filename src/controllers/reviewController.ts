import { inject, injectable } from "inversify";
import { IReviewService } from "../services/interface/IReviewService";
import TYPES from "../di/type";
import { AuthRequest } from "../middleware/authMiddleware";
import { NextFunction } from "express-serve-static-core";
import { response, Response } from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode";

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
}