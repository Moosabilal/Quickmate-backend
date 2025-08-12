import { promises } from "dns";
import { IAddAndEditServiceForm } from "../../dto/service.dto";
import { IService } from "../../models/Service";
import { IBaseRepository } from "./base/IBaseRepository";

export interface IServiceRepository extends IBaseRepository<IService> {
    findBySubCategoryId(subCategoryId: string, providerid: string): Promise<boolean>;
    findByProviderId(providerid: string): Promise<IService[]>;
    findById(serviceId: string): Promise<IService>;
}