import { type ReviewStatus } from "../../enums/review.enum";
import { type IReviewFilters, type PopulatedReview } from "../../interface/review";
import { type IReview } from "../../models/Review";

export interface IReviewService {
  addReview(bookingId: string, rating: number, review: string): Promise<{ message: string }>;
  getPaginatedReviews(filters: IReviewFilters): Promise<{ reviews: PopulatedReview[]; total: number }>;
  updateReviewStatus(reviewId: string, newStatus: ReviewStatus): Promise<IReview>;
}
