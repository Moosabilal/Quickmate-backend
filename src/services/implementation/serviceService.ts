import { inject, injectable } from "inversify";
import { IServiceRepository } from "../../repositories/interface/IServiceRepository";
import { IServiceService } from "../interface/IServiceService";
import TYPES from "../../di/type";
import { IAddAndEditServiceForm, IProviderServicePageResponse } from "../../dto/service.dto";
import { IProviderRepository } from "../../repositories/interface/IProviderRepository";
import { ICategoryRepository } from "../../repositories/interface/ICategoryRepository";
import { toProviderServicePage, toServiceEditPage } from "../../mappers/service.mapper";
import { IService } from "../../models/Service";
import { CustomError } from "../../utils/CustomError";
import { HttpStatusCode } from "../../enums/HttpStatusCode";

@injectable()
export class ServiceService implements IServiceService {
    private serviceRepository: IServiceRepository;
    private providerRepositroy: IProviderRepository;
    private categoryRepository: ICategoryRepository;
    constructor(@inject(TYPES.ServiceRepository) serviceRepository: IServiceRepository,
        @inject(TYPES.ProviderRepository) providerRepository: IProviderRepository,
        @inject(TYPES.CategoryRepository) categoryRepository: ICategoryRepository,
    ) {
        this.serviceRepository = serviceRepository;
        this.providerRepositroy = providerRepository
        this.categoryRepository = categoryRepository
    }

    public async addService(serviceData: IAddAndEditServiceForm): Promise<{ message: string, success: boolean }> {
        const _providerId = await this.providerRepositroy.getProviderId(serviceData.userId)
        const dataToCreate: IAddAndEditServiceForm = {
            ...serviceData,
            providerId: _providerId,
        }

        const isExisting = await this.serviceRepository.findBySubCategoryId(serviceData.subCategoryId, _providerId)
        if (isExisting) {
            return {
                message: "This service already added to your profile",
                success: false
            }
        }

        await this.serviceRepository.create(dataToCreate as Partial<IService>);

        return {
            message: "Service successfully added to your profile",
            success: true
        }
    }

    public async getProviderServices(providerId: string): Promise<{ services: IProviderServicePageResponse[] }> {
        const services = await this.serviceRepository.findByProviderId(providerId);

        const categoryIds = [...new Set(services.map(s => s.categoryId.toString()))];
        const subCategoryIds = [...new Set(services.map(s => s.subCategoryId.toString()))];
        const categories = await this.categoryRepository.findByIds(categoryIds);
        const subCategories = await this.categoryRepository.findByIds(subCategoryIds);

        const categoryMap = new Map(categories.map(cat => [cat._id.toString(), cat.name]));
        const subCategoryMap = new Map(subCategories.map(sub => [
                sub._id.toString(),
                { name: sub.name, iconUrl: sub.iconUrl }
            ])
        );

        const mappedServices = toProviderServicePage(services, categoryMap, subCategoryMap);

        return { services: mappedServices };
    }

    public async getServiceById(id: string): Promise<IAddAndEditServiceForm> {
        const service = await this.serviceRepository.findById(id)
        const category = await this.categoryRepository.findById(service.subCategoryId.toString())
        return toServiceEditPage(service, category)
    }

    public async updateService(id: string, serviceData: IAddAndEditServiceForm): Promise<{message: string, success: boolean}> {
        const service = await this.serviceRepository.findById(id)
        if(!service) {
            throw new CustomError('No service found, Unable to update', HttpStatusCode.NOT_FOUND)
        }
        await this.serviceRepository.update(id, serviceData)
        console.log('service second part working fine')

        return {
            message: "Service successfully updated ",
            success: true
        }
    }

    public async deleteService(id: string): Promise<{message: string}> {
        const service = await this.serviceRepository.findById(id)

        if(!service){
            throw new CustomError('the service not found in your account', HttpStatusCode.NOT_FOUND)
        }

        await this.serviceRepository.delete(id)

        return {
            message: `${service.title} deleted successfully`
        }
    }

}