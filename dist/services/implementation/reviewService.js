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
import { inject, injectable } from "inversify";
import TYPES from "../../di/type";
import { ReviewStatus } from "../../enums/review.enum";
import { CustomError } from "../../utils/CustomError";
import { HttpStatusCode } from "../../enums/HttpStatusCode";
let ReviewService = class ReviewService {
    _reviewRepository;
    _bookingRepository;
    _providerRepository;
    constructor(reviewRepository, bookingRepository, providerRepository) {
        this._reviewRepository = reviewRepository;
        this._bookingRepository = bookingRepository;
        this._providerRepository = providerRepository;
    }
    async addReview(bookingId, rating, review) {
        const booking = await this._bookingRepository.findById(bookingId);
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
            status: ReviewStatus.PENDING,
        };
        await this._reviewRepository.create(reviewData);
        booking.reviewed = true;
        await this._bookingRepository.update(bookingId, booking);
        return {
            message: "Your Review Submitted",
        };
    }
    async getPaginatedReviews(filters) {
        return this._reviewRepository.findReviewsWithDetails(filters);
    }
    async updateReviewStatus(reviewId, newStatus) {
        const review = await this._reviewRepository.findById(reviewId);
        if (!review) {
            throw new CustomError("Review not found", HttpStatusCode.NOT_FOUND);
        }
        review.status = newStatus;
        const updatedReview = await this._reviewRepository.update(reviewId, review);
        const reviews = await this._reviewRepository.findAll({
            providerId: review.providerId,
            status: ReviewStatus.APPROVED,
        });
        const totalRatings = reviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = reviews.length > 0 ? totalRatings / reviews.length : 0;
        await this._providerRepository.update(review.providerId.toString(), {
            rating: avgRating,
        });
        return updatedReview;
    }
};
ReviewService = __decorate([
    injectable(),
    __param(0, inject(TYPES.ReviewRepository)),
    __param(1, inject(TYPES.BookingRepository)),
    __param(2, inject(TYPES.ProviderRepository)),
    __metadata("design:paramtypes", [Object, Object, Object])
], ReviewService);
export { ReviewService };
