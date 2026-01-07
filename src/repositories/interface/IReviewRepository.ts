import { type IReviewFilters, type PopulatedReview } from "../../interface/review";
import { type IReview } from "../../models/Review";
import { type IBaseRepository } from "./base/IBaseRepository";

export interface IReviewRepository extends IBaseRepository<IReview> {
  getReviewCountsByProvider(): Promise<{ providerId: string; reviewCount: number }[]>;
  findReviewsByProviderIds(providerIds: string[]): Promise<IReview[]>;
  findReviewsWithUserInfo(providerId: string): Promise<IReview[]>;
  findReviewsWithDetails(options: IReviewFilters): Promise<{ reviews: PopulatedReview[]; total: number }>;
  getAverageRating(): Promise<number>;
  getReviewStatsByServiceIds(
    serviceIds: string[],
  ): Promise<{ serviceId: string; avgRating: number; reviewCount: number }[]>;
}
