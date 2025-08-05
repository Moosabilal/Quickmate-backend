import { IAddAndEditServiceForm } from "../../dto/service.dto";
import Service, { IService } from "../../models/Service";
import { IServiceRepository } from "../interface/IServiceRepository";


export class ServiceRepository implements IServiceRepository  {
    async createService(serviceData: IAddAndEditServiceForm): Promise<void> {
        const service = new Service(serviceData)
        await service.save()
    }
}