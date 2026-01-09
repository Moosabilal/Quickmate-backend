import { type ReviewStatus } from "../../enums/review.enum.js";
import { type IReviewFilters, type PopulatedReview } from "../../interface/review.js";
import { type IReview } from "../../models/Review.js";

export interface IReviewService {
  addReview(bookingId: string, rating: number, review: string): Promise<{ message: string }>;
  getPaginatedReviews(filters: IReviewFilters): Promise<{ reviews: PopulatedReview[]; total: number }>;
  updateReviewStatus(reviewId: string, newStatus: ReviewStatus): Promise<IReview>;
}
