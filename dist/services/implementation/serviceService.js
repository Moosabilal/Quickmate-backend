var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { inject, injectable } from "inversify";
import {} from "../../repositories/interface/IServiceRepository.js";
import {} from "../interface/IServiceService.js";
import TYPES from "../../di/type.js";
import {} from "../../interface/service.js";
import {} from "../../repositories/interface/IProviderRepository.js";
import {} from "../../repositories/interface/ICategoryRepository.js";
import { toProviderServicePage, toServiceEditPage } from "../../utils/mappers/service.mapper.js";
import {} from "../../models/Service.js";
import { CustomError } from "../../utils/CustomError.js";
import { HttpStatusCode } from "../../enums/HttpStatusCode.js";
import {} from "../../repositories/interface/IReviewRepository.js";
let ServiceService = class ServiceService {
    _serviceRepository;
    _providerRepositroy;
    _categoryRepository;
    _reviewRepository;
    constructor(serviceRepository, providerRepository, categoryRepository, reviewRepository) {
        this._serviceRepository = serviceRepository;
        this._providerRepositroy = providerRepository;
        this._categoryRepository = categoryRepository;
        this._reviewRepository = reviewRepository;
    }
    async addService(serviceData) {
        const _providerId = await this._providerRepositroy.getProviderId(serviceData.userId);
        const dataToCreate = {
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
        await this._serviceRepository.create(dataToCreate);
        return {
            message: "Service successfully added to your profile",
            success: true,
        };
    }
    async getProviderServices(providerId) {
        const services = await this._serviceRepository.findByProviderId(providerId);
        if (!services.length)
            return { services: [] };
        const categoryIds = [...new Set(services.map((s) => s.categoryId.toString()))];
        const subCategoryIds = [...new Set(services.map((s) => s.subCategoryId.toString()))];
        const serviceIds = services.map((s) => s._id.toString());
        const categories = await this._categoryRepository.findByIds(categoryIds);
        const subCategories = await this._categoryRepository.findByIds(subCategoryIds);
        const reviewStats = await this._reviewRepository.getReviewStatsByServiceIds(serviceIds);
        const reviewMap = new Map(reviewStats.map((stat) => [
            stat.serviceId.toString(),
            { avgRating: stat.avgRating, reviewCount: stat.reviewCount },
        ]));
        const categoryMap = new Map(categories.map((cat) => [cat._id.toString(), cat.name]));
        const subCategoryMap = new Map(subCategories.map((sub) => [sub._id.toString(), { name: sub.name, iconUrl: sub.iconUrl }]));
        const mappedServices = toProviderServicePage(services, categoryMap, subCategoryMap, reviewMap);
        return { services: mappedServices };
    }
    async getServiceById(id) {
        const service = await this._serviceRepository.findById(id);
        const category = await this._categoryRepository.findById(service.subCategoryId.toString());
        return toServiceEditPage(service, category);
    }
    async updateService(id, serviceData) {
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
    async deleteService(id) {
        const service = await this._serviceRepository.findById(id);
        if (!service) {
            throw new CustomError("the service not found in your account", HttpStatusCode.NOT_FOUND);
        }
        await this._serviceRepository.delete(id);
        return {
            message: `${service.title} deleted successfully`,
        };
    }
};
ServiceService = __decorate([
    injectable(),
    __param(0, inject(TYPES.ServiceRepository)),
    __param(1, inject(TYPES.ProviderRepository)),
    __param(2, inject(TYPES.CategoryRepository)),
    __param(3, inject(TYPES.ReviewRepository)),
    __metadata("design:paramtypes", [Object, Object, Object, Object])
], ServiceService);
export { ServiceService };
