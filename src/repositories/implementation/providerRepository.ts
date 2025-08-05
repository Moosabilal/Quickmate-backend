import { Category } from "../../models/Categories";
import mongoose from 'mongoose';

import { Provider, IProvider } from "../../models/Providers";
import User from "../../models/User";
import { IProviderForAdminResponce, IProviderProfile, ProviderFilterQuery } from "../../dto/provider.dto";
import { IProviderRepository } from "../interface/IProviderRepository";


export class ProviderRepository implements IProviderRepository {
    async createProvider(data: Partial<IProvider>): Promise<IProvider> {
        const provider = new Provider(data);
        await provider.save();
        // if (data.userId) {
        //     const updatedUser = await User.findByIdAndUpdate(
        //         data.userId,
        //         { role: 'ServiceProvider' },
        //         { new: true }
        //     );

        //     if (!updatedUser) {
        //         throw new Error('User not found while updating role.');
        //     }
        // }

        return provider;

    }

    async findByEmail(email: string, includeOtpFields?: boolean): Promise<IProvider> {
        let query = Provider.findOne<IProvider>({ email });
        if (includeOtpFields) {
            query = query.select('+registrationOtp +registrationOtpExpires +registrationOtpAttempts');
        }
        return await query.exec();
    }

    async update(provider: IProvider): Promise<IProvider> {
        return await provider.save()
    }

    async updateProvider(updateData: Partial<IProviderProfile>): Promise<IProvider | null> {
        const data = await Provider.findOneAndUpdate({ userId: updateData.userId }, updateData, { new: true });
        return data

    }

    async getProviderByUserId(userId: string): Promise<IProvider | null> {
        const data = await Provider.findOne({ userId: userId })
        return data

    }

    async getAllProviders(): Promise<IProvider[]> {
        return await Provider.find({});
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

    async updateStatusById(id: string, newStatus: string): Promise<void> {
        await Provider.findByIdAndUpdate(id, { status: newStatus })
    }

    async getProviderByServiceId(filterQuery: ProviderFilterQuery): Promise<IProvider[]> {
        return await Provider.find(filterQuery)

    }

    async getProviderId(userId: string): Promise<string> {
        const provider =  await Provider.findOne({userId}).select('_id')
        return provider._id.toString()
    }


}