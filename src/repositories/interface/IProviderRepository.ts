import { IProvider } from "../../models/Providers";
import { IProviderForAdminResponce } from "../../types/provider";


export interface IProviderRepository {
    createProvider(data: Partial<IProvider>): Promise<IProvider>;
    getAllProviders(): Promise<IProvider[]>;
    findProvidersWithFilter(filter: any, skip: number, limit: number): Promise<IProvider[]>;
    countProviders(filter: any): Promise<number>;
}