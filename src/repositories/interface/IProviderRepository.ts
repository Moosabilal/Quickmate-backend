import { IProvider } from "../../models/Providers";
import { IProviderForAdminResponce, IProviderProfile, ProviderFilterQuery } from "../../dto/provider.dto";
import { IBaseRepository } from "./base/IBaseRepository";


export interface IProviderRepository extends IBaseRepository<IProvider> {
    createProvider(data: Partial<IProvider>): Promise<IProvider>;
    findByEmail(email: string, includeOtpFields?: boolean): Promise<IProvider>;
    getAllProviders(): Promise<IProvider[]>;
    findProvidersWithFilter(filter: any, skip: number, limit: number): Promise<IProvider[]>;
    countProviders(filter: any): Promise<number>;
    getProviderByUserId(userId: string): Promise<IProvider | null>;
    updateProvider(updateData: Partial<IProvider>): Promise<IProvider | null>;
    updateStatusById(id: string, newStatus: string): Promise<void>;
    getProviderByServiceId(filterQuery: ProviderFilterQuery): Promise<IProvider[]>;
    getProviderId(userId: string): Promise<string>;


}