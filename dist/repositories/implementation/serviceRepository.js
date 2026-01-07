var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { injectable } from "inversify";
import Service from "../../models/Service";
import { BaseRepository } from "./base/BaseRepository";
import { Types } from "mongoose";
let ServiceRepository = class ServiceRepository extends BaseRepository {
    constructor() {
        super(Service);
    }
    async findBySubCategoryId(subCategoryId, providerId) {
        const service = await Service.findOne({ subCategoryId, providerId });
        return !!service;
    }
    async findByProviderId(providerId) {
        const services = await Service.find({ providerId });
        return services;
    }
    async findServiceCount(providerId) {
        return await Service.countDocuments({ providerId });
    }
    async findById(serviceId) {
        return await Service.findOne({ _id: serviceId });
    }
    async findServicesByCriteria(criteria) {
        const filter = {
            subCategoryId: new Types.ObjectId(criteria.subCategoryId),
        };
        if (criteria.minExperience) {
            filter.experience = { $gte: criteria.minExperience };
        }
        if (criteria.maxPrice) {
            filter.price = { $lte: criteria.maxPrice };
        }
        return this.findAll(filter);
    }
    async findPopulatedByProviderId(providerId) {
        const services = await this.model
            .find({ providerId: new Types.ObjectId(providerId) })
            .populate("subCategoryId", "name")
            .exec();
        return services;
    }
    async findServicesWithProvider(subCategoryId, maxPrice) {
        const matchStage = {
            $match: {
                subCategoryId: new Types.ObjectId(subCategoryId),
                status: true,
            },
        };
        if (maxPrice) {
            matchStage.$match.price = { $lte: maxPrice };
        }
        return this.model.aggregate([
            matchStage,
            {
                $lookup: {
                    from: "providers",
                    localField: "providerId",
                    foreignField: "_id",
                    as: "provider",
                },
            },
            { $unwind: "$provider" },
            {
                $match: { "provider.status": "Approved" },
            },
            {
                $project: {
                    title: 1,
                    price: 1,
                    "provider._id": 1,
                    "provider.fullName": 1,
                    "provider.rating": 1,
                },
            },
        ]);
    }
};
ServiceRepository = __decorate([
    injectable(),
    __metadata("design:paramtypes", [])
], ServiceRepository);
export { ServiceRepository };
