import { inject, injectable } from "inversify";
import { IProviderRepository } from "../../repositories/interface/IProviderRepository";
import { IProviderService } from "../interface/IProviderService";
import TYPES from "../../di/type";
import mongoose from "mongoose";
import { IProvider } from "../../models/Providers";
import { IFeaturedProviders, IProviderForAdminResponce, IProviderProfile } from "../../dto/provider.dto";
import { ICategoryRepository } from "../../repositories/interface/ICategoryRepository";
import jwt, { JwtPayload } from 'jsonwebtoken'
import { HttpStatusCode } from "../../enums/HttpStatusCode";
import { ErrorMessage } from "../../enums/ErrorMessage";
import { CustomError } from "../../utils/CustomError";

export enum ProviderStatus {
    Active = 'Active',
    Suspended = 'Suspended',
    Pending = 'Pending',
    Rejected = 'Rejected'
}


@injectable()
export class ProviderService implements IProviderService {
    private providerRepository: IProviderRepository
    private categoryRepository: ICategoryRepository;

    constructor(@inject(TYPES.ProviderRepository) providerRepository: IProviderRepository,
        @inject(TYPES.CategoryRepository) categoryRepository: ICategoryRepository
    ) {
        this.providerRepository = providerRepository
        this.categoryRepository = categoryRepository
    }

    public async registerProvider(data: IProvider): Promise<IProviderProfile> {
        const savedProvider = await this.providerRepository.createProvider(data);

        return {
            id: savedProvider._id.toString(),
            userId: savedProvider.userId.toString(),
            fullName: savedProvider.fullName,
            phoneNumber: savedProvider.phoneNumber,
            email: savedProvider.email,
            serviceId: savedProvider.serviceId.toString(),
            serviceLocation: savedProvider.serviceLocation,
            serviceArea: savedProvider.serviceArea,
            profilePhoto: savedProvider.profilePhoto,
            price: savedProvider.price,
            status: savedProvider.status,
            experience: savedProvider.experience,
            timeSlot: savedProvider.timeSlot,
            verificationDocs: savedProvider.verificationDocs,
            availableDays: savedProvider.availableDays

        }
    }

    public async updateProviderDetails(updateData: Partial<IProviderProfile>): Promise<IProviderProfile> {
        const updatedProvider = await this.providerRepository.updateProvider(updateData)
        return {
            id: updatedProvider._id.toString(),
            userId: updatedProvider.userId.toString(),
            fullName: updatedProvider.fullName,
            phoneNumber: updatedProvider.phoneNumber,
            email: updatedProvider.email,
            serviceId: updatedProvider.serviceId.toString(),
            serviceLocation: updatedProvider.serviceLocation,
            serviceArea: updatedProvider.serviceArea,
            profilePhoto: updatedProvider.profilePhoto,
            price: updatedProvider.price,
            status: updatedProvider.status,
            experience: updatedProvider.experience,
            timeSlot: updatedProvider.timeSlot,
            verificationDocs: updatedProvider.verificationDocs,
            availableDays: updatedProvider.availableDays

        }

    }


    public async getProviderWithAllDetails(): Promise<IProvider[]> {
        return this.providerRepository.getAllProviders();
    }

    public async providersForAdmin(
        page: number,
        limit: number,
        search: string,
        status: string
    ): Promise<{
        data: IProviderForAdminResponce[];
        total: number;
        totalPages: number;
        currentPage: number;
    }> {
        const skip = (page - 1) * limit;


        const filter: any = {
            $or: [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ],
        };

        if (status && status !== 'All') {
            if (status === 'Active') {
                filter.status = "Active";
            } else if (status === 'Rejected') {
                filter.status = "Rejected";
            } else if (status === "Suspended") {
                filter.status = "Suspended";
            } else if (status === "Pending") {
                filter.status = "Pending"
            }
        }

        const [providers, total] = await Promise.all([
            this.providerRepository.findProvidersWithFilter(filter, skip, limit),
            this.providerRepository.countProviders(filter),
        ]);

        if (!providers || providers.length === 0) {
            const error = new Error('No providers found.');
            (error as any).statusCode = 404;
            throw error;
        }

        const categories = await this.categoryRepository.getAllCategories();
        const categoryMap = new Map(categories.map(cat => [cat._id.toString(), cat]));

        const data = providers.map(provider => {
            const category = categoryMap.get(provider.serviceId.toString());
            return {
                id: provider._id.toString(),
                userId: provider.userId.toString(),
                fullName: provider.fullName,
                phoneNumber: provider.phoneNumber,
                email: provider.email,
                serviceId: provider.serviceId.toString(),
                serviceArea: provider.serviceArea,
                profilePhoto: provider.profilePhoto,
                status: provider.status,
                servicesOffered: category?.name || null,
            };
        });

        return {
            data,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }

    public async fetchProviderById(token: string): Promise<IProviderProfile> {
        if (!token) {
            throw new CustomError(ErrorMessage.MISSING_TOKEN, HttpStatusCode.UNAUTHORIZED);
        }
        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
        } catch (error) {
            throw new Error('Invalid token.');
        }

        const provider = await this.providerRepository.getProviderByUserId(decoded.id)
        return {
            id: provider._id.toString(),
            userId: provider.userId.toString(),
            fullName: provider.fullName,
            phoneNumber: provider.phoneNumber,
            email: provider.email,
            serviceId: provider.serviceId.toString(),
            serviceLocation: provider.serviceLocation,
            serviceArea: provider.serviceArea,
            profilePhoto: provider.profilePhoto,
            status: provider.status,
            experience: provider.experience,
            timeSlot: provider.timeSlot,
            price: provider.price,
            verificationDocs: provider.verificationDocs,
            availableDays: provider.availableDays

        }
    }

    public async getFeaturedProviders(page: number, limit: number, search: string): Promise<{ providers: IFeaturedProviders[], total: number, totalPages: number, currentPage: number }> {
        const skip = (page - 1) * limit;

        const filter: any = {
            $or: [
                { fullName: { $regex: search, $options: 'i' } },
                { serviceName: { $regex: search, $options: 'i' } },
            ]
        }
        const providers = await this.providerRepository.findProvidersWithFilter(filter, skip, limit);
        const total = await this.providerRepository.countProviders(filter)

        const featuredProviders = providers.map(provider => ({
            id: provider._id.toString(),
            userId: provider.userId.toString(),
            fullName: provider.fullName,
            profilePhoto: provider.profilePhoto,
            serviceName: provider.serviceName

        }))

        return {
            providers: featuredProviders,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        }
    }

    public async updateProviderStat(id: string, newStatus: string): Promise<{ message: string }> {
        if (!newStatus) {
            throw new CustomError('Status is required', HttpStatusCode.BAD_REQUEST);
        }

        const allowedStatuses = Object.values(ProviderStatus);
        if (!allowedStatuses.includes(newStatus as ProviderStatus)) {
            throw new CustomError(`Invalid status. Allowed: ${allowedStatuses.join(", ")}`, HttpStatusCode.BAD_REQUEST);
        }
        await this.providerRepository.updateStatusById(id, newStatus)
        return { message: "provider Status updated" }
    }

    public async getProviderwithFilters(serviceId: string, filters: { area?: string; experience?: number; day?: string; time?: string; price?: number }): Promise<IProvider[]> {
        const filterQuery: any = {
            serviceId: new mongoose.Types.ObjectId(serviceId),
        };

        if (filters.area) {
            filterQuery.serviceArea = { $regex: new RegExp(filters.area, 'i') };
        }

        if (filters.experience) {
            filterQuery.experience = { $gte: filters.experience };
        }

        if (filters.day) {
            filterQuery.availableDays = filters.day;
        }

        if (filters.time) {
            filterQuery['timeSlot.startTime'] = { $lte: filters.time };
            filterQuery['timeSlot.endTime'] = { $gte: filters.time };
        }

        if (filters.price) {
            filterQuery['price'] = { $lte: filters.price };
        }
        const provider = await this.providerRepository.getProviderByServiceId(filterQuery)
        
        return provider

    }






}