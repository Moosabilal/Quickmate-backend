import { IReviewFilters, PopulatedReview } from "../../interface/review";

export interface IReviewService {
    addReview(bookingId: string, rating: number, review: string ): Promise<{message: string}>;
    getPaginatedReviews(filters: IReviewFilters): Promise<{ reviews: PopulatedReview[]; total: number }>
}