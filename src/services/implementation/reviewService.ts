import { inject, injectable } from "inversify";
import { IReviewService } from "../interface/IReviewService";
import { IReviewRepository } from "../../repositories/interface/IReviewRepository";
import TYPES from "../../di/type";

@injectable()
export class ReviewService implements IReviewService {
    private _reviewRepository: IReviewRepository;
    constructor(@inject(TYPES.ReviewRepository) reviewRepository: IReviewRepository){
        this._reviewRepository = reviewRepository;
    }
}