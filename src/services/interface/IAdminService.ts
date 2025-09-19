import { IProviderDashboardRes } from "../../interface/provider.dto";

export interface IAdminService {
    getAdminDashboard(): Promise<IProviderDashboardRes>
}