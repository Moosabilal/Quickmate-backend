import { injectable } from "inversify";
import Review, { IReview } from "../../models/Review";
import { IReviewRepository } from "../interface/IReviewRepository";
import { BaseRepository } from "./base/BaseRepository";
import { FilterQuery, PipelineStage, Types } from "mongoose";
import { IReviewFilters, PopulatedReview } from "../../interface/review";

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

    public async findReviewsWithUserInfo(providerId: string): Promise<IReview[]> {
        return Review.find({ providerId })
            .populate({ path: "userId", select: "name profilePicture" })
            .exec();
    }

    public async findReviewsWithDetails(options: IReviewFilters): Promise<{ reviews: PopulatedReview[]; total: number }> {
        const { page = 1, limit = 10, search, rating, sort = 'newest' } = options;
        const skip = (page - 1) * limit;

        const pipeline: PipelineStage[] = [];

        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user'
            }
        });

        pipeline.push({
            $lookup: {
                from: 'providers',
                localField: 'providerId',
                foreignField: '_id',
                as: 'provider'
            }
        });

        pipeline.push({ $unwind: '$user' });
        pipeline.push({ $unwind: '$provider' });

        const matchStage: FilterQuery<any> = {};

        if (rating) {
            matchStage.rating = rating;
        }

        if (search) {
            matchStage.$or = [
                { 'user.name': { $regex: search, $options: 'i' } },
                { 'provider.fullName': { $regex: search, $options: 'i' } },
                { reviewText: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }
        
        pipeline.push({
            $facet: {
                total: [{ $count: 'count' }],
                data: [
                    { $sort: { createdAt: sort === 'newest' ? -1 : 1 } },
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $project: {
                            _id: 1,
                            reviewContent: '$reviewText',
                            rating: 1,
                            date: '$createdAt',
                            'user.name': '$user.name',
                            'provider.name': '$provider.fullName'
                        }
                    }
                ]
            }
        });

        const result = await Review.aggregate(pipeline);
        
        const reviews = result[0].data;
        const total = result[0].total[0] ? result[0].total[0].count : 0;
        
        const formattedReviews = reviews.map((r: any) => ({
            ...r,
            id: r._id.toString(),
            date: new Date(r.date).toISOString().split('T')[0]
        }));

        return { reviews: formattedReviews, total };
    }

    public async getAverageRating(): Promise<number> {
        const result = await this.model.aggregate([
            { $group: { _id: null, avgRating: { $avg: '$rating' } } }
        ]);
        return result[0]?.avgRating || 0;
    }
    
}