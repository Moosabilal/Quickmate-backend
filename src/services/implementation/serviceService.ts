import { inject, injectable } from "inversify";
import { type IServiceRepository } from "../../repositories/interface/IServiceRepository.js";
import { type IServiceService } from "../interface/IServiceService.js";
import TYPES from "../../di/type.js";
import { type IAddAndEditServiceForm, type IProviderServicePageResponse } from "../../interface/service.js";
import { type IProviderRepository } from "../../repositories/interface/IProviderRepository.js";
import { type ICategoryRepository } from "../../repositories/interface/ICategoryRepository.js";
import { toProviderServicePage, toServiceEditPage } from "../../utils/mappers/service.mapper.js";
import { type IService } from "../../models/Service.js";
import { CustomError } from "../../utils/CustomError.js";
import { HttpStatusCode } from "../../enums/HttpStatusCode.js";
import { type IReviewRepository } from "../../repositories/interface/IReviewRepository.js";

@injectable()
export class ServiceService implements IServiceService {
  private _serviceRepository: IServiceRepository;
  private _providerRepositroy: IProviderRepository;
  private _categoryRepository: ICategoryRepository;
  private _reviewRepository: IReviewRepository;

  constructor(
    @inject(TYPES.ServiceRepository) serviceRepository: IServiceRepository,
    @inject(TYPES.ProviderRepository) providerRepository: IProviderRepository,
    @inject(TYPES.CategoryRepository) categoryRepository: ICategoryRepository,
    @inject(TYPES.ReviewRepository) reviewRepository: IReviewRepository,
  ) {
    this._serviceRepository = serviceRepository;
    this._providerRepositroy = providerRepository;
    this._categoryRepository = categoryRepository;
    this._reviewRepository = reviewRepository;
  }

  public async addService(serviceData: IAddAndEditServiceForm): Promise<{ message: string; success: boolean }> {
    const _providerId = await this._providerRepositroy.getProviderId(serviceData.userId);
    const dataToCreate: IAddAndEditServiceForm = {
      ...serviceData,
      providerId: _providerId,
    };

    const isExisting = await this._serviceRepository.findBySubCategoryId(serviceData.subCategoryId, _providerId);
    if (isExisting) {
      return {
        message: "This service already added to your profile",
        success: false,
      };
    }

    await this._serviceRepository.create(dataToCreate as Partial<IService>);

    return {
      message: "Service successfully added to your profile",
      success: true,
    };
  }

  public async getProviderServices(providerId: string): Promise<{ services: IProviderServicePageResponse[] }> {
    const services = await this._serviceRepository.findByProviderId(providerId);
    if (!services.length) return { services: [] };

    const categoryIds = [...new Set(services.map((s) => s.categoryId.toString()))];
    const subCategoryIds = [...new Set(services.map((s) => s.subCategoryId.toString()))];
    const serviceIds = services.map((s) => s._id.toString());

    const categories = await this._categoryRepository.findByIds(categoryIds);
    const subCategories = await this._categoryRepository.findByIds(subCategoryIds);

    const reviewStats = await this._reviewRepository.getReviewStatsByServiceIds(serviceIds);
    const reviewMap = new Map(
      reviewStats.map((stat) => [
        stat.serviceId.toString(),
        { avgRating: stat.avgRating, reviewCount: stat.reviewCount },
      ]),
    );

    const categoryMap = new Map(categories.map((cat) => [cat._id.toString(), cat.name]));
    const subCategoryMap = new Map(
      subCategories.map((sub) => [sub._id.toString(), { name: sub.name, iconUrl: sub.iconUrl }]),
    );

    const mappedServices = toProviderServicePage(services, categoryMap, subCategoryMap, reviewMap);

    return { services: mappedServices };
  }

  public async getServiceById(id: string): Promise<IAddAndEditServiceForm> {
    const service = await this._serviceRepository.findById(id);
    const category = await this._categoryRepository.findById(service.subCategoryId.toString());
    return toServiceEditPage(service, category);
  }

  public async updateService(
    id: string,
    serviceData: Partial<IAddAndEditServiceForm>,
  ): Promise<{ message: string; success: boolean }> {
    const service = await this._serviceRepository.findById(id);
    if (!service) {
      throw new CustomError("No service found, Unable to update", HttpStatusCode.NOT_FOUND);
    }
    await this._serviceRepository.update(id, serviceData);
    return {
      message: "Service successfully updated ",
      success: true,
    };
  }

  public async deleteService(id: string): Promise<{ message: string }> {
    const service = await this._serviceRepository.findById(id);

    if (!service) {
      throw new CustomError("the service not found in your account", HttpStatusCode.NOT_FOUND);
    }

    await this._serviceRepository.delete(id);

    return {
      message: `${service.title} deleted successfully`,
    };
  }
}
