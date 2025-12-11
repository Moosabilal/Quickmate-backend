import { IProvider } from "../../models/Providers";
import { IProviderFilter, IProviderForAdminResponce, IProviderProfile, IProviderRegistrationData, ITopActiveProviders, ProviderFilterQuery } from "../../interface/provider";
import { IBaseRepository } from "./base/IBaseRepository";


export interface IProviderRepository extends IBaseRepository<IProvider> {
    createProvider(data: IProviderRegistrationData): Promise<IProvider>;
    findByEmail(email: string, includeOtpFields?: boolean): Promise<IProvider>;
    getAllProviders(): Promise<IProvider[]>;
    findProvidersWithFilter(filter: IProviderFilter): Promise<IProvider[]>;
    countProviders(filter: IProviderFilter): Promise<number>; 
    getProviderByUserId(userId: string): Promise<IProvider | null>;
    updateProvider(updateData: Partial<IProviderRegistrationData>): Promise<IProvider | null>;
    updateStatusById(id: string, newStatus: string): Promise<void>;
    getProviderByServiceId(filterQuery: ProviderFilterQuery): Promise<IProvider[]>;
    getProviderId(userId: string): Promise<string>;
    getTopActiveProviders(): Promise<ITopActiveProviders[]>;
    findFilteredProviders(criteria: {
        providerIds: string[];
        userIdToExclude: string;
        lat?: number;
        long?: number;
        radius?: number;
        date?: string;
        time?: string;
    }): Promise<IProvider[]>;
    getTopProvidersByEarnings(limit?: number): Promise<{ name: string; earnings: number }[]>;
    findProvidersByIdsAndSearch(providerIds: string[], search?: string): Promise<IProvider[]>;

}