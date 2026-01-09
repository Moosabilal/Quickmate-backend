import { type IServiceWithProvider } from "../../interface/service.js";
import { type IService } from "../../models/Service.js";
import { type IBaseRepository } from "./base/IBaseRepository.js";
import { type IPopulatedService } from "../../interface/provider.js";

export interface IServiceRepository extends IBaseRepository<IService> {
  findBySubCategoryId(subCategoryId: string, providerid: string): Promise<boolean>;
  findByProviderId(providerid: string): Promise<IService[]>;
  findServiceCount(providerId: string): Promise<number>;
  findById(serviceId: string): Promise<IService>;
  findServicesByCriteria(criteria: {
    subCategoryId: string;
    minExperience?: number;
    maxPrice?: number;
  }): Promise<IService[]>;
  findPopulatedByProviderId(providerId: string): Promise<IPopulatedService[]>;
  findServicesWithProvider(subCategoryId: string, maxPrice?: number): Promise<IServiceWithProvider[]>;
}
