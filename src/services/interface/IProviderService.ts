import { IProvider } from "../../models/Providers";
import { EarningsAnalyticsData, IAvailabilityUpdateData, IBackendProvider, IDashboardResponse, IDashboardStatus, IFeaturedProviders, IProviderDetailsResponse, IProviderForAdminResponce, IProviderForChatListPage, IProviderPerformance, IProviderProfile, IProviderRegistrationData, IServiceAddPageResponse } from "../../interface/provider";
import { ILoginResponseDTO, ResendOtpRequestBody, VerifyOtpRequestBody } from "../../interface/auth";
import { calendar_v3 } from 'googleapis';


export interface IProviderService {
    registerProvider(data: IProviderRegistrationData): Promise<{message: string, email: string}>;
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
    updateProviderDetails(updateData: Partial<IProviderRegistrationData>): Promise<IProviderProfile>;
    updateProviderStat(id: string, newStatus: string): Promise<{message: string}>;
    getProviderwithFilters(userId: string, serviceId: string, filters: {radiusKm?: number, lat?: number, long?: number, experience?: number; date?: string; time?: string; price?: number}): Promise<IBackendProvider[]>;
    providerForChatPage(userId: string, search?: string): Promise<IProviderForChatListPage[]>;
    getProviderDashboard(userId: string): Promise<{dashboardData: IDashboardResponse[], dashboardStat: IDashboardStatus}>;
    getAvailabilityByLocation(
        userId: string,
        serviceSubCategoryId: string,
        userLat: number,
        userLng: number,
        radiusKm: number,
        timeMin: string,
        timeMax: string
    ): Promise<Array<{ providerId: string; providerName: string; availableSlots: calendar_v3.Schema$TimePeriod[] }>>;
    getEarningsAnalytics(userId: string, period: 'week' | 'month'): Promise<EarningsAnalyticsData>;
    getProviderPerformance(userId: string): Promise<IProviderPerformance>;
    getAvailability(userId: string): Promise<IProvider['availability']>;
    updateAvailability(userId: string, data: IAvailabilityUpdateData): Promise<IProvider['availability']>;
    getPublicProviderDetails(providerId: string): Promise<IProviderDetailsResponse>;

}