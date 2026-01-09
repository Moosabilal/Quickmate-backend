import { inject, injectable } from "inversify";
import { type IReviewService } from "../interface/IReviewService.js";
import { type IReviewRepository } from "../../repositories/interface/IReviewRepository.js";
import TYPES from "../../di/type.js";
import { type IBookingRepository } from "../../repositories/interface/IBookingRepository.js";
import { type IReview } from "../../models/Review.js";
import { ReviewStatus } from "../../enums/review.enum.js";
import { type IProviderRepository } from "../../repositories/interface/IProviderRepository.js";
import { type IBooking } from "../../models/Booking.js";
import { type IReviewFilters, type PopulatedReview } from "../../interface/review.js";
import { CustomError } from "../../utils/CustomError.js";
import { HttpStatusCode } from "../../enums/HttpStatusCode.js";

@injectable()
export class ReviewService implements IReviewService {
  private _reviewRepository: IReviewRepository;
  private _bookingRepository: IBookingRepository;
  private _providerRepository: IProviderRepository;
  constructor(
    @inject(TYPES.ReviewRepository) reviewRepository: IReviewRepository,
    @inject(TYPES.BookingRepository) bookingRepository: IBookingRepository,
    @inject(TYPES.ProviderRepository) providerRepository: IProviderRepository,
  ) {
    this._reviewRepository = reviewRepository;
    this._bookingRepository = bookingRepository;
    this._providerRepository = providerRepository;
  }

  public async addReview(bookingId: string, rating: number, review: string): Promise<{ message: string }> {
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

    return {
      message: "Your Review Submitted",
    };
  }

  public async getPaginatedReviews(filters: IReviewFilters): Promise<{ reviews: PopulatedReview[]; total: number }> {
    return this._reviewRepository.findReviewsWithDetails(filters);
  }

  public async updateReviewStatus(reviewId: string, newStatus: ReviewStatus): Promise<IReview> {
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

    const totalRatings = reviews.reduce((sum: number, r: IReview) => sum + (r.rating as number), 0);
    const avgRating = reviews.length > 0 ? totalRatings / reviews.length : 0;

    await this._providerRepository.update(review.providerId.toString(), {
      rating: avgRating,
    });

    return updatedReview;
  }
}
