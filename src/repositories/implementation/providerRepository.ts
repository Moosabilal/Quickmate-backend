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

    async getProviderByUserid(userId: string) {
        const data =  Provider.find({userId: userId})
        console.log('the backen dat', data)
        return data
        
    }

    async getAllProviders(): Promise<IProvider[]> {
        return Provider.find({});
    }

    async findProvidersWithFilter(filter: any, skip: number, limit: number): Promise<IProvider[]> {
        return await Provider.find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
    }

    async countProviders(filter: any): Promise<number> {
        return await Provider.countDocuments(filter);
    }


}