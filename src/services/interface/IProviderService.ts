import { IProvider } from "../../models/Providers";
import { EarningsAnalyticsData, IBackendProvider, IDashboardResponse, IDashboardStatus, IFeaturedProviders, IProviderForAdminResponce, IProviderForChatListPage, IProviderPerformance, IProviderProfile, IServiceAddPageResponse } from "../../interface/provider.dto";
import { ILoginResponseDTO, ResendOtpRequestBody, VerifyOtpRequestBody } from "../../interface/auth.dto";
import { calendar_v3 } from 'googleapis';


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
    updateProviderDetails(updateData: Partial<IProvider>): Promise<IProviderProfile>;
    updateProviderStat(id: string, newStatus: string): Promise<{message: string}>;
    getProviderwithFilters(userId: string, serviceId: string, filters: {radiusKm?: number, lat?: number, long?: number, experience?: number; date?: string; time?: string; price?: number}): Promise<IBackendProvider[]>;
    providerForChatPage(userId: string): Promise<IProviderForChatListPage[]>;
    getProviderDashboard(userId: string): Promise<{dashboardData: IDashboardResponse[], dashboardStat: IDashboardStatus}>;
    getAvailabilityByLocation(
        serviceSubCategoryId: string,
        userLat: number,
        userLng: number,
        radiusKm: number,
        timeMin: string,
        timeMax: string
    ): Promise<Array<{ providerId: string; providerName: string; availableSlots: calendar_v3.Schema$TimePeriod[] }>>;
    getEarningsAnalytics(userId: string, period: 'week' | 'month'): Promise<EarningsAnalyticsData>;
    getProviderPerformance(userId: string): Promise<IProviderPerformance>;

}