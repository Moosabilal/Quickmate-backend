import { inject, injectable } from "inversify";
import { IProviderRepository } from "../../repositories/interface/IProviderRepository";
import { IProviderService } from "../interface/IProviderService";
import TYPES from "../../di/type";
import { IProvider } from "../../models/Providers";
import { IFeaturedProviders, IProviderForAdminResponce } from "../../types/provider";
import { ICategoryRepository } from "../../repositories/interface/ICategoryRepository";

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

    public async registerProvider(data: IProvider): Promise<{ email: string; message: string }> {
        const savedProvider = await this.providerRepository.createProvider(data);

        return {
            email: savedProvider.email,
            message: 'Provider registered successfully',
        };
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
            } else if(status === "Suspended"){
                filter.status = "Suspended";
            } else if(status === "Pending"){
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

    public async getFeaturedProviders(page: number, limit: number, search: string): Promise<{providers: IFeaturedProviders[],total: number, totalPages: number, currentPage: number}> {
        const skip = (page - 1) * limit;

        const filter: any = {
            $or: [
                {fullName: { $regex: search, $options: 'i'}},
                {serviceName: { $regex: search, $options: 'i'}},
            ]
        }
        const providers = await this.providerRepository.findProvidersWithFilter(filter, skip, limit);
        const total = await this.providerRepository.countProviders(filter)

        const featuredProviders =  providers.map(provider => ({
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


}