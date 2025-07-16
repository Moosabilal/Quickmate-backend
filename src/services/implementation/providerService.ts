import { inject, injectable } from "inversify";
import { IProviderRepository } from "../../repositories/interface/IProviderRepository";
import { IProviderService } from "../interface/IProviderService";
import TYPES from "../../di/type";
import { IProvider } from "../../models/Providers";

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
}