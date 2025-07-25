import { IProvider } from "../../models/Providers";
import { IProviderForAdminResponce, IProviderProfile } from "../../types/provider";


export interface IProviderRepository {
    createProvider(data: Partial<IProvider>): Promise<IProvider>;
    getAllProviders(): Promise<IProvider[]>;
    findProvidersWithFilter(filter: any, skip: number, limit: number): Promise<IProvider[]>;
    countProviders(filter: any): Promise<number>;
    getProviderByUserId(userId: string): Promise<IProvider | null>;
    updateProvider(updateData: Partial<IProviderProfile>): Promise<IProvider | null>;
    updateStatusById(id: string, newStatus: string): Promise<void>;

}