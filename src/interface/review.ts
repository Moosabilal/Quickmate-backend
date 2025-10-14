import { Types } from "mongoose";
import { IReview } from "../models/Review";

export interface IReviewFilters {
    page: number;
    limit: number;
    search?: string;
    rating?: number;
    sort?: 'newest' | 'oldest';
}

export type PopulatedReview = IReview & {
    user: { _id: Types.ObjectId; name: string };
    provider: { _id: Types.ObjectId; fullName: string };
};

export interface IReviewFilters {
    page: number;
    limit: number;
    search?: string;
    rating?: number;
    sort?: 'newest' | 'oldest';
}