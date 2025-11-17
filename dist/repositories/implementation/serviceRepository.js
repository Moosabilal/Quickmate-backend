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
exports.ServiceRepository = void 0;
const inversify_1 = require("inversify");
const Service_1 = __importDefault(require("../../models/Service"));
const BaseRepository_1 = require("./base/BaseRepository");
const mongoose_1 = require("mongoose");
let ServiceRepository = class ServiceRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super(Service_1.default);
    }
    findBySubCategoryId(subCategoryId, providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const service = yield Service_1.default.findOne({ subCategoryId, providerId });
            return !!service;
        });
    }
    findByProviderId(providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const services = yield Service_1.default.find({ providerId });
            return services;
        });
    }
    findServiceCount(providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Service_1.default.countDocuments({ providerId });
        });
    }
    findById(serviceId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Service_1.default.findOne({ _id: serviceId });
        });
    }
    findServicesByCriteria(criteria) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = {
                subCategoryId: new mongoose_1.Types.ObjectId(criteria.subCategoryId),
            };
            if (criteria.minExperience) {
                filter.experience = { $gte: criteria.minExperience };
            }
            if (criteria.maxPrice) {
                filter.price = { $lte: criteria.maxPrice };
            }
            return this.findAll(filter);
        });
    }
    findPopulatedByProviderId(providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.find({ providerId: new mongoose_1.Types.ObjectId(providerId) })
                .populate('categoryId', 'name')
                .populate('subCategoryId', 'name')
                .lean();
        });
    }
    findServicesWithProvider(subCategoryId, maxPrice) {
        return __awaiter(this, void 0, void 0, function* () {
            const matchStage = {
                $match: {
                    subCategoryId: new mongoose_1.Types.ObjectId(subCategoryId),
                    status: true,
                }
            };
            if (maxPrice) {
                matchStage.$match.price = { $lte: maxPrice };
            }
            return this.model.aggregate([
                matchStage,
                {
                    $lookup: {
                        from: 'providers',
                        localField: 'providerId',
                        foreignField: '_id',
                        as: 'provider'
                    }
                },
                { $unwind: '$provider' },
                {
                    $match: { 'provider.status': 'Approved' }
                },
                {
                    $project: {
                        title: 1,
                        price: 1,
                        'provider.fullName': 1,
                        'provider.rating': 1,
                    }
                }
            ]);
        });
    }
};
exports.ServiceRepository = ServiceRepository;
exports.ServiceRepository = ServiceRepository = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], ServiceRepository);
