import { injectable } from "inversify";
import Review, { IReview } from "../../models/Review";
import { IReviewRepository } from "../interface/IReviewRepository";
import { BaseRepository } from "./base/BaseRepository";

@injectable()
export class ReviewRepository extends BaseRepository<IReview> implements IReviewRepository {

    constructor() {
        super(Review)
    }
}