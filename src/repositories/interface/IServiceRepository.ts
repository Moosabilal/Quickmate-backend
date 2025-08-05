import { promises } from "dns";
import { IAddAndEditServiceForm } from "../../dto/service.dto";
import { IService } from "../../models/Service";

export interface IServiceRepository {
    createService(serviceData: IAddAndEditServiceForm): Promise<void>;
}