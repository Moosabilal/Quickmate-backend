import { injectable } from "inversify";
import Review, { IReview } from "../../models/Review";
import { IReviewRepository } from "../interface/IReviewRepository";
import { BaseRepository } from "./base/BaseRepository";

@injectable()
export class ReviewRepository extends BaseRepository<IReview> implements IReviewRepository {

    constructor() {
        super(Review)
    }

    async getReviewCountsByProvider(): Promise<{ providerId: string; reviewCount: number }[]> {
        const result = await Review.aggregate([
            {
                $group: {
                    _id: "$providerId",
                    reviewCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    providerId: "$_id",
                    reviewCount: 1
                }
            },
        ]);

        return result;
    }
}