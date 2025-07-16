import { Category } from "../../models/Categories";
import { Provider, IProvider } from "../../models/Providers";
import User from "../../models/User";
import { IProviderForAdminResponce } from "../../types/provider";
import { IProviderRepository } from "../interface/IProviderRepository";


export class ProviderRepository implements IProviderRepository {
    async createProvider(data: Partial<IProvider>): Promise<IProvider> {
        const provider = new Provider(data);
        await provider.save();
        if (data.userId) {
            const updatedUser = await User.findByIdAndUpdate(
                data.userId,
                { role: 'ServiceProvider' },
                { new: true }
            );

            if (!updatedUser) {
                throw new Error('User not found while updating role.');
            }
        }

        return provider;

    }

    async getAllProviders(): Promise<IProvider[]> {
        return Provider.find();
    }

    async getProvidersForAdmin(): Promise<IProviderForAdminResponce[]> {
        const data = await Provider.aggregate([
            {
                $lookup: {
                    from: 'categories', // 🔧 corrected collection name
                    localField: 'serviceId',
                    foreignField: '_id',
                    as: 'services',
                },
            },
            {
                $unwind: {
                    path: '$services',
                    preserveNullAndEmptyArrays: true, // Optional: keep provider even if no matching category
                },
            },
            {
                $project: {
                    userId: 1,
                    fullName: 1,
                    phoneNumber: 1,
                    email: 1,
                    serviceId: 1,
                    serviceArea: 1,
                    profilePhoto: 1,
                    status: 1,
                    serviceName: '$services.name', // 👈 simplified access
                    serviceCategoryId: '$services._id',
                },
            },
        ]);

        console.log('this isthe data', data)
        return data
    }
}