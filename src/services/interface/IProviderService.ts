import { IProvider } from "../../models/Providers";


export interface IProviderService {
    registerProvider(data: IProvider): Promise<{email: string, message: string}>;
    getProviderWithAllDetails(): Promise<IProvider[]>;
}