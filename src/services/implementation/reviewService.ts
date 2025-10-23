import { inject, injectable } from "inversify";
import { IReviewService } from "../interface/IReviewService";
import { IReviewRepository } from "../../repositories/interface/IReviewRepository";
import TYPES from "../../di/type";
import { IBookingRepository } from "../../repositories/interface/IBookingRepository";
import { IReview } from "../../models/Review";
import { ReviewStatus } from "../../enums/review.enum";
import message from "../../models/message";
import { IProviderRepository } from "../../repositories/interface/IProviderRepository";
import { IBooking } from "../../models/Booking";
import { IReviewFilters, PopulatedReview } from "../../interface/review";

@injectable()
export class ReviewService implements IReviewService {
    private _reviewRepository: IReviewRepository;
    private _bookingRepository: IBookingRepository;
    private _providerRepository: IProviderRepository;
    constructor(@inject(TYPES.ReviewRepository) reviewRepository: IReviewRepository,
        @inject(TYPES.BookingRepository) bookingRepository: IBookingRepository,
        @inject(TYPES.ProviderRepository) providerRepository: IProviderRepository
    ) {
        this._reviewRepository = reviewRepository;
        this._bookingRepository = bookingRepository;
        this._providerRepository = providerRepository;
    }

    public async addReview(
        bookingId: string,
        rating: number,
        review: string
    ): Promise<{ message: string }> {
        const booking: IBooking = await this._bookingRepository.findById(bookingId);

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

        const reviews = (await this._reviewRepository.findAll({
            providerId: booking.providerId,
            status: ReviewStatus.PENDING,
        })) as IReview[];

        const totalRatings = reviews.reduce((sum: number, r: IReview) => sum + (r.rating as number), 0);
        const avgRating = reviews.length > 0 ? totalRatings / reviews.length : 0;

        await this._providerRepository.update(booking.providerId.toString(), {
            rating: avgRating,
        });

        return {
            message: "Your Review Submitted",
        };
    }

    public async getPaginatedReviews(
        filters: IReviewFilters
    ): Promise<{ reviews: PopulatedReview[]; total: number }> {
        return this._reviewRepository.findReviewsWithDetails(filters);
    }

}