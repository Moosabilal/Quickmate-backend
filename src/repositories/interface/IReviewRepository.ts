import { IReview } from "../../models/Review";
import { IBaseRepository } from "./base/IBaseRepository";

export interface IReviewRepository extends IBaseRepository<IReview> {
    getReviewCountsByProvider(): Promise<{ providerId: string; reviewCount: number }[]>;
}