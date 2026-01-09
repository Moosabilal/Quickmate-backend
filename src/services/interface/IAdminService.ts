import { type IAnalyticsData } from "../../interface/admin.js";
import { type IProviderDashboardRes } from "../../interface/provider.js";

export interface IAdminService {
  getAdminDashboard(): Promise<IProviderDashboardRes>;
  getDashboardAnalytics(): Promise<IAnalyticsData>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
}
