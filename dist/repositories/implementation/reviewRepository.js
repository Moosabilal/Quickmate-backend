var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { injectable } from "inversify";
import Review, {} from "../../models/Review.js";
import {} from "../interface/IReviewRepository.js";
import { BaseRepository } from "./base/BaseRepository.js";
import { Types } from "mongoose";
import {} from "../../interface/review.js";
import { ReviewStatus } from "../../enums/review.enum.js";
let ReviewRepository = class ReviewRepository extends BaseRepository {
    constructor() {
        super(Review);
    }
    async getReviewCountsByProvider() {
        const result = await Review.aggregate([
            {
                $group: {
                    _id: "$providerId",
                    reviewCount: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    providerId: "$_id",
                    reviewCount: 1,
                },
            },
        ]);
        return result;
    }
    async findReviewsByProviderIds(providerIds) {
        const filter = {
            providerId: { $in: providerIds.map((id) => new Types.ObjectId(id)) },
        };
        return this.findAll(filter);
    }
    async findReviewsWithUserInfo(providerId) {
        return Review.find({ providerId }).populate({ path: "userId", select: "name profilePicture" }).exec();
    }
    async findReviewsWithDetails(options) {
        const { page = 1, limit = 10, search, rating, sort = "newest", status } = options;
        const skip = (page - 1) * limit;
        const pipeline = [];
        pipeline.push({
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user",
            },
        });
        pipeline.push({
            $lookup: {
                from: "providers",
                localField: "providerId",
                foreignField: "_id",
                as: "provider",
            },
        });
        pipeline.push({ $unwind: "$user" });
        pipeline.push({ $unwind: "$provider" });
        const matchStage = {};
        if (status) {
            matchStage.status = status;
        }
        if (rating) {
            matchStage.rating = rating;
        }
        if (search) {
            matchStage.$or = [
                { "user.name": { $regex: search, $options: "i" } },
                { "provider.fullName": { $regex: search, $options: "i" } },
                { reviewText: { $regex: search, $options: "i" } },
            ];
        }
        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }
        pipeline.push({
            $facet: {
                total: [{ $count: "count" }],
                data: [
                    { $sort: { createdAt: sort === "newest" ? -1 : 1 } },
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $project: {
                            _id: 1,
                            reviewContent: "$reviewText",
                            rating: 1,
                            status: 1,
                            date: "$createdAt",
                            "user.id": "$userId",
                            "user.name": "$user.name",
                            "user.isVerified": "$user.isVerified",
                            "provider.id": "$providerId",
                            "provider.name": "$provider.fullName",
                        },
                    },
                ],
            },
        });
        const result = await Review.aggregate(pipeline);
        const reviews = result[0].data;
        const total = result[0].total[0] ? result[0].total[0].count : 0;
        const formattedReviews = reviews.map((r) => ({
            ...r,
            id: r._id.toString(),
            date: new Date(r.date).toISOString().split("T")[0],
        }));
        return { reviews: formattedReviews, total };
    }
    async getAverageRating() {
        const result = await this.model.aggregate([{ $group: { _id: null, avgRating: { $avg: "$rating" } } }]);
        return result[0]?.avgRating || 0;
    }
    async getReviewStatsByServiceIds(serviceIds) {
        const result = await Review.aggregate([
            {
                $match: {
                    serviceId: { $in: serviceIds.map((id) => new Types.ObjectId(id)) },
                    status: ReviewStatus.APPROVED,
                },
            },
            {
                $group: {
                    _id: "$serviceId",
                    avgRating: { $avg: "$rating" },
                    reviewCount: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    serviceId: "$_id",
                    avgRating: { $round: ["$avgRating", 1] },
                    reviewCount: 1,
                },
            },
        ]);
        return result;
    }
};
ReviewRepository = __decorate([
    injectable(),
    __metadata("design:paramtypes", [])
], ReviewRepository);
export { ReviewRepository };
