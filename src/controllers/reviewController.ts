import { inject, injectable } from "inversify";
import { IReviewService } from "../services/interface/IReviewService";
import TYPES from "../di/type";

@injectable()
export class ReviewController {
    private _reviewService: IReviewService;
    constructor(@inject(TYPES.ReviewService) reviewService: IReviewService){
        this._reviewService = reviewService
    }
}