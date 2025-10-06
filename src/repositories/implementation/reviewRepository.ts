import { injectable } from "inversify";
import Review, { IReview } from "../../models/Review";
import { IReviewRepository } from "../interface/IReviewRepository";
import { BaseRepository } from "./base/BaseRepository";
import { Types } from "mongoose";

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

    public async findReviewsByProviderIds(providerIds: string[]): Promise<IReview[]> {
    const filter = { providerId: { $in: providerIds.map(id => new Types.ObjectId(id)) } };
    return this.findAll(filter);
  }
}