import { injectable } from "inversify";
import { IAddAndEditServiceForm } from "../../interface/service";
import Service, { IService } from "../../models/Service";
import { IServiceRepository } from "../interface/IServiceRepository";
import { BaseRepository } from "./base/BaseRepository";
import { FilterQuery, PipelineStage, Types } from "mongoose";

@injectable()
export class ServiceRepository extends BaseRepository<IService> implements IServiceRepository {

    constructor() {
        super(Service)
    }

    async findBySubCategoryId(subCategoryId: string, providerId: string): Promise<boolean> {
        const service = await Service.findOne({ subCategoryId, providerId });
        return !!service

    }

    async findByProviderId(providerId: string): Promise<IService[]> {
        const services = await Service.find({ providerId })
        return services
    }

    async findServiceCount(providerId: string): Promise<number> {
        return await Service.countDocuments({ providerId });
    }

    async findById(serviceId: string): Promise<IService> {
        return await Service.findOne({ _id: serviceId })
    }

    public async findServicesByCriteria(criteria: {
        subCategoryId: string;
        minExperience?: number;
        maxPrice?: number;
    }): Promise<IService[]> {
        const filter: FilterQuery<IService> = {
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

    public async findPopulatedByProviderId(providerId: string): Promise<IService[]> {

        return this.model.find({ providerId: new Types.ObjectId(providerId) })
            .populate('categoryId', 'name')
            .populate('subCategoryId', 'name')
            .lean();
    }

    public async findServicesWithProvider(
        subCategoryId: string, 
        maxPrice?: number
    ): Promise<IService[]> {
        
        const matchStage: PipelineStage.Match = {
            $match: {
                subCategoryId: new Types.ObjectId(subCategoryId),
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
    }
}