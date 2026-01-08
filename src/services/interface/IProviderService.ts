import { type IProvider } from "../../models/Providers";
import {
  type EarningsAnalyticsData,
  type IAvailabilityUpdateData,
  type IBackendProvider,
  type IDashboardResponse,
  type IDashboardStatus,
  type IFeaturedProviders,
  type IProviderDetailsResponse,
  type IProviderForAdminResponce,
  type IProviderForChatListPage,
  type IProviderPerformance,
  type IProviderProfile,
  type IProviderRegistrationData,
  type IServiceAddPageResponse,
} from "../../interface/provider";
import { type ILoginResponseDTO, type ResendOtpRequestBody, type VerifyOtpRequestBody } from "../../interface/auth";
import { type calendar_v3 } from "googleapis";
import { type IProviderFullDetails } from "../../interface/admin";

export interface IProviderService {
  registerProvider(data: IProviderRegistrationData): Promise<{ message: string; email: string }>;
  verifyOtp(data: VerifyOtpRequestBody): Promise<{
    provider?: IProviderProfile;
    user?: ILoginResponseDTO;
    message?: string;
  }>;
  resendOtp(data: ResendOtpRequestBody): Promise<{ message: string }>;
  getProviderWithAllDetails(): Promise<IProviderProfile[]>;
  providersForAdmin(
    page: number,
    limit: number,
    search: string,
    status: string,
    rating?: number,
  ): Promise<{
    data: IProviderForAdminResponce[];
    total: number;
    totalPages: number;
    currentPage: number;
  }>;
  getFeaturedProviders(
    page: number,
    limit: number,
    search: string,
  ): Promise<{
    providers: IFeaturedProviders[];
    total: number;
    totalPages: number;
    currentPage: number;
  }>;
  getServicesForAddservice(): Promise<{
    mainCategories: IServiceAddPageResponse[];
    services: IServiceAddPageResponse[];
  }>;
  fetchProviderById(userId: string): Promise<IProviderProfile>;
  updateProviderDetails(updateData: Partial<IProviderRegistrationData>): Promise<IProviderProfile>;
  updateProviderStat(id: string, newStatus: string, reason?: string): Promise<{ message: string }>;
  getProviderwithFilters(
    userId: string,
    serviceId: string,
    filters: {
      radiusKm?: number;
      lat?: number;
      long?: number;
      experience?: number;
      date?: string;
      time?: string;
      price?: number;
    },
  ): Promise<IBackendProvider[]>;
  providerForChatPage(userId: string, search?: string): Promise<IProviderForChatListPage[]>;
  getProviderDashboard(userId: string): Promise<{
    dashboardData: IDashboardResponse[];
    dashboardStat: IDashboardStatus;
  }>;
  getAvailabilityByLocation(
    userId: string,
    serviceSubCategoryId: string,
    userLat: number,
    userLng: number,
    radiusKm: number,
    timeMin: string,
    timeMax: string,
  ): Promise<
    Array<{
      providerId: string;
      providerName: string;
      availableSlots: calendar_v3.Schema$TimePeriod[];
    }>
  >;
  getEarningsAnalytics(userId: string, period: "week" | "month"): Promise<EarningsAnalyticsData>;
  getProviderPerformance(userId: string): Promise<IProviderPerformance>;
  getAvailability(userId: string): Promise<IProvider["availability"]>;
  updateAvailability(userId: string, data: IAvailabilityUpdateData): Promise<IProvider["availability"]>;
  getPublicProviderDetails(providerId: string): Promise<IProviderDetailsResponse>;
  findProvidersAvailableAtSlot(providerIds: string[], date: string, time: string): Promise<IProvider[]>;
  findNearbyProviders(
    coordinates: [number, number],
    radiusInKm: number,
    serviceId: string,
  ): Promise<IProviderProfile[]>;
  getProviderFullDetails(providerId: string): Promise<IProviderFullDetails>;
}
