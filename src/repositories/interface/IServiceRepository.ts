import { promises } from "dns";
import { IAddAndEditServiceForm, IServiceWithProvider } from "../../interface/service";
import { IService } from "../../models/Service";
import { IBaseRepository } from "./base/IBaseRepository";
import { IPopulatedService } from "../../interface/provider";

export interface IServiceRepository extends IBaseRepository<IService> {
    findBySubCategoryId(subCategoryId: string, providerid: string): Promise<boolean>;
    findByProviderId(providerid: string): Promise<IService[]>;
    findServiceCount(providerId: string): Promise<number>
    findById(serviceId: string): Promise<IService>;
    findServicesByCriteria(criteria: {subCategoryId: string;minExperience?: number;maxPrice?: number;}): Promise<IService[]>
    findPopulatedByProviderId(providerId: string): Promise<IPopulatedService[]>;
    findServicesWithProvider(
        subCategoryId: string, 
        maxPrice?: number
    ): Promise<IServiceWithProvider[]>;
}