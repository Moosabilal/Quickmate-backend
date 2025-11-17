"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewRepository = void 0;
const inversify_1 = require("inversify");
const Review_1 = __importDefault(require("../../models/Review"));
const BaseRepository_1 = require("./base/BaseRepository");
const mongoose_1 = require("mongoose");
let ReviewRepository = class ReviewRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super(Review_1.default);
    }
    getReviewCountsByProvider() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield Review_1.default.aggregate([
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
        });
    }
    findReviewsByProviderIds(providerIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = { providerId: { $in: providerIds.map(id => new mongoose_1.Types.ObjectId(id)) } };
            return this.findAll(filter);
        });
    }
    findReviewsWithUserInfo(providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            return Review_1.default.find({ providerId })
                .populate({ path: "userId", select: "name profilePicture" })
                .exec();
        });
    }
    findReviewsWithDetails(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, limit = 10, search, rating, sort = 'newest', status } = options;
            const skip = (page - 1) * limit;
            const pipeline = [];
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
            const matchStage = {};
            if (status) {
                matchStage.status = status;
            }
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
                                status: 1,
                                date: '$createdAt',
                                'user.id': '$userId',
                                'user.name': '$user.name',
                                'user.isVerified': '$user.isVerified',
                                'provider.id': '$providerId',
                                'provider.name': '$provider.fullName'
                            }
                        }
                    ]
                }
            });
            const result = yield Review_1.default.aggregate(pipeline);
            const reviews = result[0].data;
            const total = result[0].total[0] ? result[0].total[0].count : 0;
            const formattedReviews = reviews.map((r) => (Object.assign(Object.assign({}, r), { id: r._id.toString(), date: new Date(r.date).toISOString().split('T')[0] })));
            return { reviews: formattedReviews, total };
        });
    }
    getAverageRating() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield this.model.aggregate([
                { $group: { _id: null, avgRating: { $avg: '$rating' } } }
            ]);
            return ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.avgRating) || 0;
        });
    }
    getReviewStatsByServiceIds(serviceIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield Review_1.default.aggregate([
                {
                    $match: {
                        serviceId: { $in: serviceIds.map(id => new mongoose_1.Types.ObjectId(id)) },
                        // status: "APPROVED" 
                    }
                },
                {
                    $group: {
                        _id: "$serviceId",
                        avgRating: { $avg: "$rating" },
                        reviewCount: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        serviceId: "$_id",
                        avgRating: { $round: ["$avgRating", 1] },
                        reviewCount: 1
                    }
                }
            ]);
            return result;
        });
    }
};
exports.ReviewRepository = ReviewRepository;
exports.ReviewRepository = ReviewRepository = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], ReviewRepository);
