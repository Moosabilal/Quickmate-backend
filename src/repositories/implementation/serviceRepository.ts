import { injectable } from "inversify";
import { IAddAndEditServiceForm } from "../../interface/service.dto";
import Service, { IService } from "../../models/Service";
import { IServiceRepository } from "../interface/IServiceRepository";
import { BaseRepository } from "./base/BaseRepository";

@injectable()
export class ServiceRepository extends BaseRepository<IService> implements IServiceRepository  {

    constructor() {
        super(Service)
    }

    async findBySubCategoryId(subCategoryId: string, providerId: string): Promise<boolean> {
        const service = await Service.findOne({ subCategoryId, providerId });
        return !!service
        
    }

    async findByProviderId(providerId: string): Promise<IService[]> {
        const services = await Service.find({providerId})
        return services
    }

    async findById(serviceId: string): Promise<IService> {
        return await Service.findOne({_id: serviceId})
    }
}