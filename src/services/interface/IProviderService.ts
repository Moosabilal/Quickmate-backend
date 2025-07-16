import { IProvider } from "../../models/Providers";
import { IProviderForAdminResponce } from "../../types/provider";


export interface IProviderService {
    registerProvider(data: IProvider): Promise<{email: string, message: string}>;
    getProviderWithAllDetails(): Promise<IProvider[]>;
    providersForAdmin(): Promise<IProviderForAdminResponce[]>


}