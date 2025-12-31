"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceService = void 0;
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../../di/type"));
const service_mapper_1 = require("../../utils/mappers/service.mapper");
const CustomError_1 = require("../../utils/CustomError");
const HttpStatusCode_1 = require("../../enums/HttpStatusCode");
let ServiceService = class ServiceService {
    constructor(serviceRepository, providerRepository, categoryRepository, reviewRepository) {
        this._serviceRepository = serviceRepository;
        this._providerRepositroy = providerRepository;
        this._categoryRepository = categoryRepository;
        this._reviewRepository = reviewRepository;
    }
    addService(serviceData) {
        return __awaiter(this, void 0, void 0, function* () {
            const _providerId = yield this._providerRepositroy.getProviderId(serviceData.userId);
            const dataToCreate = Object.assign(Object.assign({}, serviceData), { providerId: _providerId });
            const isExisting = yield this._serviceRepository.findBySubCategoryId(serviceData.subCategoryId, _providerId);
            if (isExisting) {
                return {
                    message: "This service already added to your profile",
                    success: false
                };
            }
            yield this._serviceRepository.create(dataToCreate);
            return {
                message: "Service successfully added to your profile",
                success: true
            };
        });
    }
    getProviderServices(providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const services = yield this._serviceRepository.findByProviderId(providerId);
            if (!services.length)
                return { services: [] };
            const categoryIds = [...new Set(services.map(s => s.categoryId.toString()))];
            const subCategoryIds = [...new Set(services.map(s => s.subCategoryId.toString()))];
            const serviceIds = services.map(s => s._id.toString());
            const categories = yield this._categoryRepository.findByIds(categoryIds);
            const subCategories = yield this._categoryRepository.findByIds(subCategoryIds);
            const reviewStats = yield this._reviewRepository.getReviewStatsByServiceIds(serviceIds);
            const reviewMap = new Map(reviewStats.map(stat => [stat.serviceId.toString(), { avgRating: stat.avgRating, reviewCount: stat.reviewCount }]));
            const categoryMap = new Map(categories.map(cat => [cat._id.toString(), cat.name]));
            const subCategoryMap = new Map(subCategories.map(sub => [sub._id.toString(), { name: sub.name, iconUrl: sub.iconUrl }]));
            const mappedServices = (0, service_mapper_1.toProviderServicePage)(services, categoryMap, subCategoryMap, reviewMap);
            return { services: mappedServices };
        });
    }
    getServiceById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const service = yield this._serviceRepository.findById(id);
            const category = yield this._categoryRepository.findById(service.subCategoryId.toString());
            return (0, service_mapper_1.toServiceEditPage)(service, category);
        });
    }
    updateService(id, serviceData) {
        return __awaiter(this, void 0, void 0, function* () {
            const service = yield this._serviceRepository.findById(id);
            if (!service) {
                throw new CustomError_1.CustomError('No service found, Unable to update', HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            yield this._serviceRepository.update(id, serviceData);
            return {
                message: "Service successfully updated ",
                success: true
            };
        });
    }
    deleteService(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const service = yield this._serviceRepository.findById(id);
            if (!service) {
                throw new CustomError_1.CustomError('the service not found in your account', HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            yield this._serviceRepository.delete(id);
            return {
                message: `${service.title} deleted successfully`
            };
        });
    }
};
exports.ServiceService = ServiceService;
exports.ServiceService = ServiceService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.ServiceRepository)),
    __param(1, (0, inversify_1.inject)(type_1.default.ProviderRepository)),
    __param(2, (0, inversify_1.inject)(type_1.default.CategoryRepository)),
    __param(3, (0, inversify_1.inject)(type_1.default.ReviewRepository)),
    __metadata("design:paramtypes", [Object, Object, Object, Object])
], ServiceService);
