import { IProvider } from "../../models/Providers";
import { IFeaturedProviders, IProviderForAdminResponce, IProviderProfile, IServiceAddPageResponse } from "../../dto/provider.dto";
import { ILoginResponseDTO, ResendOtpRequestBody, VerifyOtpRequestBody } from "../../dto/auth.dto";


export interface IProviderService {
    registerProvider(data: IProvider): Promise<{message: string, email: string}>;
    verifyOtp(data: VerifyOtpRequestBody): Promise<{ provider?: IProviderProfile, user?: ILoginResponseDTO, message?: string }>
    resendOtp(data: ResendOtpRequestBody): Promise<{ message: string }>
    getProviderWithAllDetails(): Promise<IProvider[]>;
    providersForAdmin(page: number, limit: number, search: string, status: string): Promise<{ data: IProviderForAdminResponce[], total: number, totalPages: number, currentPage: number }>;
    getFeaturedProviders(page: number, limit: number, search: string): Promise<{
        providers: IFeaturedProviders[],
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getServicesForAddservice() : Promise<{mainCategories: IServiceAddPageResponse[], services: IServiceAddPageResponse[]}>
    fetchProviderById(userId: string): Promise<IProviderProfile>;
    updateProviderDetails(updateData: Partial<IProviderProfile>): Promise<IProviderProfile>;
    updateProviderStat(id: string, newStatus: string): Promise<{message: string}>;
    getProviderwithFilters(serviceId: string, filters: {area?: string; experience?: number; day?: string; time?: string; price?: number}): Promise<IProvider[]>;



}