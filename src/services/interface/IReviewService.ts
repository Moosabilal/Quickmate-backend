
export interface IReviewService {
    addReview(bookingId: string, rating: number, review: string ): Promise<{message: string}>
}