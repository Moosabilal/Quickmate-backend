import { inject, injectable } from "inversify";
import { IProviderRepository } from "../../repositories/interface/IProviderRepository";
import { IProviderService } from "../interface/IProviderService";
import TYPES from "../../di/type";
import { IProvider } from "../../models/Providers";
import { IProviderForAdminResponce } from "../../types/provider";

@injectable()
export class ProviderService implements IProviderService {
    private providerRepository: IProviderRepository
    constructor(@inject(TYPES.ProviderRepository) providerRepository: IProviderRepository) {
        this.providerRepository = providerRepository
    }

    public async registerProvider(data: IProvider): Promise<{ email: string; message: string }> {
        const savedProvider = await this.providerRepository.createProvider(data);

        return {
            email: savedProvider.email,
            message: 'Provider registered successfully',
        };
    }

    public async getProviderWithAllDetails(): Promise<IProvider[]> {
    return this.providerRepository.getAllProviders();
  }

  public async providersForAdmin(): Promise<IProviderForAdminResponce[]> {
    const providers = await this.providerRepository.getProvidersForAdmin()
    const providersList = providers.map((doc) => ({
        ...doc,
        userId: doc.userId.toString(),
        serviceId: doc.serviceId.toString(),
        serviceCategoryId: doc.serviceCategoryId.toString()
    }))
    console.log('this ithe providers', providers)
    return providersList
  }
  
}