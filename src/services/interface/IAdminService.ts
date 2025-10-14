import { IAnalyticsData } from "../../interface/admin";
import { IProviderDashboardRes } from "../../interface/provider.dto";

export interface IAdminService {
    getAdminDashboard(): Promise<IProviderDashboardRes>;
    getDashboardAnalytics(): Promise<IAnalyticsData>;
}