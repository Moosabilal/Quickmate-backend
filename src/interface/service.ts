import { Types } from "mongoose";
import { ServicesPriceUnit } from "../enums/Services.enum";

export interface IAddAndEditServiceForm {
    id?: string;
    title: string;
    description: string;
    experience: number;
    userId?: string;
    categoryId: string;
    subCategoryId: string | null;
    duration: string,
    priceUnit: ServicesPriceUnit;
    providerId?: string;
    status: boolean;
    price: number;
    businessCertification?: string;
    categoryName?: string;
}

export interface IProviderServicePageResponse {
    id: string;
    category: string;
    title: string;
    price: number;
    serviceImage: string;
    description: string;
    rating?: number;
    reviews?: number;

}

export interface IServiceWithProvider {
    _id: Types.ObjectId;
    title: string;
    price: number;
    provider: {
        _id: Types.ObjectId;
        fullName: string;
        rating: number;
    };
}