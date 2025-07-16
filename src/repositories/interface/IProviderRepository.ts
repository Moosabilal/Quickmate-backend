import { IProvider } from "../../models/Providers";


export interface IProviderRepository {
    createProvider(data: Partial<IProvider>): Promise<IProvider>;
    getAllProviders(): Promise<IProvider[]>;
}