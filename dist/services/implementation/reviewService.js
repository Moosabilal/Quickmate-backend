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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
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
exports.ReviewService = void 0;
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../../di/type"));
const review_enum_1 = require("../../enums/review.enum");
const CustomError_1 = require("../../utils/CustomError");
const HttpStatusCode_1 = require("../../enums/HttpStatusCode");
let ReviewService = class ReviewService {
    constructor(reviewRepository, bookingRepository, providerRepository) {
        this._reviewRepository = reviewRepository;
        this._bookingRepository = bookingRepository;
        this._providerRepository = providerRepository;
    }
    addReview(bookingId, rating, review) {
        return __awaiter(this, void 0, void 0, function* () {
            const booking = yield this._bookingRepository.findById(bookingId);
            if (booking.reviewed) {
                return {
                    message: "Already submitted a review",
                };
            }
            const reviewData = {
                providerId: booking.providerId.toString(),
                userId: booking.userId.toString(),
                serviceId: booking.serviceId.toString(),
                bookingId: bookingId.toString(),
                rating,
                reviewText: review,
                status: review_enum_1.ReviewStatus.PENDING
            };
            yield this._reviewRepository.create(reviewData);
            booking.reviewed = true;
            yield this._bookingRepository.update(bookingId, booking);
            return {
                message: "Your Review Submitted",
            };
        });
    }
    getPaginatedReviews(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._reviewRepository.findReviewsWithDetails(filters);
        });
    }
    updateReviewStatus(reviewId, newStatus) {
        return __awaiter(this, void 0, void 0, function* () {
            const review = yield this._reviewRepository.findById(reviewId);
            if (!review) {
                throw new CustomError_1.CustomError("Review not found", HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            review.status = newStatus;
            const updatedReview = yield this._reviewRepository.update(reviewId, review);
            const reviews = yield this._reviewRepository.findAll({
                providerId: review.providerId,
                status: review_enum_1.ReviewStatus.APPROVED,
            });
            const totalRatings = reviews.reduce((sum, r) => sum + r.rating, 0);
            const avgRating = reviews.length > 0 ? totalRatings / reviews.length : 0;
            yield this._providerRepository.update(review.providerId.toString(), {
                rating: avgRating,
            });
            return updatedReview;
        });
    }
};
exports.ReviewService = ReviewService;
exports.ReviewService = ReviewService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.ReviewRepository)),
    __param(1, (0, inversify_1.inject)(type_1.default.BookingRepository)),
    __param(2, (0, inversify_1.inject)(type_1.default.ProviderRepository)),
    __metadata("design:paramtypes", [Object, Object, Object])
], ReviewService);
