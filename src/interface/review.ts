import { Types } from "mongoose";
import { IReview } from "../models/Review";
import { ReviewStatus } from "../enums/review.enum";

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
    status?: ReviewStatus
}

export interface RawAggregatedReview {
    _id: string;
    reviewContent: string;
    rating: number;
    status: string;
    date: Date;
    user: {
        id: string;
        name: string;
        isVerified: boolean;
    };
    provider: {
        id: string;
        name: string;
    };
}
