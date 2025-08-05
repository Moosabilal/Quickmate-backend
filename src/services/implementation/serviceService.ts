import { inject, injectable } from "inversify";
import { IServiceRepository } from "../../repositories/interface/IServiceRepository";
import { IServiceService } from "../interface/IServiceService";
import TYPES from "../../di/type";
import { IAddAndEditServiceForm } from "../../dto/service.dto";
import { IProviderRepository } from "../../repositories/interface/IProviderRepository";

@injectable()
export class ServiceService implements IServiceService {
    private serviceRepository: IServiceRepository;
    private providerRepositroy: IProviderRepository
    constructor(@inject(TYPES.ServiceRepository) serviceRepository: IServiceRepository,
        @inject(TYPES.ProviderRepository) providerRepository: IProviderRepository
    ) {
        this.serviceRepository = serviceRepository;
        this.providerRepositroy = providerRepository
    }

    public async addService(serviceData: IAddAndEditServiceForm): Promise<{message: string}> {
        const _providerId = await this.providerRepositroy.getProviderId(serviceData.userId)
        const dataToCreate: IAddAndEditServiceForm = {
            ...serviceData,
            providerId: _providerId,
        }
        await this.serviceRepository.createService(dataToCreate);

        return {
            message: "Service successfully added to your profile"
        }
    }
}