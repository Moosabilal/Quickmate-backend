import { IAnalyticsData } from "../../interface/admin";
import { IProviderDashboardRes } from "../../interface/provider";

export interface IAdminService {
    getAdminDashboard(): Promise<IProviderDashboardRes>;
    getDashboardAnalytics(): Promise<IAnalyticsData>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
}