import { IProvider } from "../../models/Providers";
import { IFeaturedProviders, IProviderForAdminResponce } from "../../types/provider";


export interface IProviderService {
    registerProvider(data: IProvider): Promise<{ email: string, message: string }>;
    getProviderWithAllDetails(): Promise<IProvider[]>;
    providersForAdmin(page: number, limit: number, search: string, status: string): Promise<{ data: IProviderForAdminResponce[], total: number, totalPages: number, currentPage: number }>;
    getFeaturedProviders(page: number, limit: number, search: string): Promise<{
        providers: IFeaturedProviders[],
        total: number;
        totalPages: number;
        currentPage: number;
    }>


}