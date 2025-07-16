import { IProvider } from "../../models/Providers";
import { IProviderForAdminResponce } from "../../types/provider";


export interface IProviderRepository {
    createProvider(data: Partial<IProvider>): Promise<IProvider>;
    getAllProviders(): Promise<IProvider[]>;
    getProvidersForAdmin(): Promise<IProviderForAdminResponce[]>;
}