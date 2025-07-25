import { IProvider } from "../../models/Providers";
import { IFeaturedProviders, IProviderForAdminResponce, IProviderProfile } from "../../types/provider";


export interface IProviderService {
    registerProvider(data: IProvider): Promise<IProviderProfile>;
    getProviderWithAllDetails(): Promise<IProvider[]>;
    providersForAdmin(page: number, limit: number, search: string, status: string): Promise<{ data: IProviderForAdminResponce[], total: number, totalPages: number, currentPage: number }>;
    getFeaturedProviders(page: number, limit: number, search: string): Promise<{
        providers: IFeaturedProviders[],
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    fetchProviderById(userId: string): Promise<IProviderProfile>;
    updateProviderDetails(updateData: Partial<IProviderProfile>): Promise<IProviderProfile>;
    updateProviderStat(id: string, newStatus: string): Promise<{message: string}>;



}