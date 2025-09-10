import { inject, injectable } from "inversify";
import { IReviewService } from "../interface/IReviewService";
import { IReviewRepository } from "../../repositories/interface/IReviewRepository";
import TYPES from "../../di/type";
import { IBookingRepository } from "../../repositories/interface/IBookingRepository";
import { IReview } from "../../models/Review";
import { ReviewStatus } from "../../enums/review.enum";
import message from "../../models/message";

@injectable()
export class ReviewService implements IReviewService {
    private _reviewRepository: IReviewRepository;
    private _bookingRepository: IBookingRepository;
    constructor(@inject(TYPES.ReviewRepository) reviewRepository: IReviewRepository,
        @inject(TYPES.BookingRepository) bookingRepository: IBookingRepository
    ) {
        this._reviewRepository = reviewRepository;
        this._bookingRepository = bookingRepository;
    }

    public async addReview(bookingId: string, rating: number, review: string): Promise<{message: string}> {
        const booking = await this._bookingRepository.findById(bookingId)
        if(booking.reviewed){
            return {
                message: "Already submitted a review"
            }
        }
        const reviewData: Partial<IReview> = {
            providerId: booking.providerId,
            userId: booking.userId,
            serviceId: booking.serviceId,
            bookingId,
            rating,
            reviewText: review,
            status: ReviewStatus.PENDING,

        }

        await this._reviewRepository.create(reviewData)
        booking.reviewed = true;
        await this._bookingRepository.update(bookingId, booking)
        return {
            message: "Your Review Submitted"
        }
    }
}