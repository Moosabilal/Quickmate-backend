import { Category } from "../../models/Categories";
import mongoose, { FilterQuery, Types } from 'mongoose';

import { Provider, IProvider } from "../../models/Providers";
import User from "../../models/User";
import { IProviderForAdminResponce, IProviderProfile, IProviderRegistrationData, ProviderFilterQuery } from "../../interface/provider";
import { IProviderRepository } from "../interface/IProviderRepository";
import { injectable } from "inversify";
import { BaseRepository } from "./base/BaseRepository";

@injectable()
export class ProviderRepository extends BaseRepository<IProvider> implements IProviderRepository {

    constructor() {
        super(Provider)
    }

    async createProvider(data: IProviderRegistrationData): Promise<IProvider> {
        const provider = new Provider(data);
        await provider.save();
        return provider;

    }

    async findByEmail(email: string, includeOtpFields?: boolean): Promise<IProvider> {
        let query = Provider.findOne<IProvider>({ email });
        if (includeOtpFields) {
            query = query.select('+registrationOtp +registrationOtpExpires +registrationOtpAttempts');
        }
        return await query.exec();
    }

    async updateProvider(updateData: Partial<IProviderRegistrationData>): Promise<IProvider | null> {
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
        const provider = await Provider.findOne({ userId }).select('_id')
        return provider._id.toString()
    }

    async getTopActiveProviders(): Promise<any[]> {
        const result = await Provider.aggregate([
            {
                $project: {
                    fullName: 1,
                    totalBookings: 1,
                    rating: 1,
                    profilePhoto: 1,
                }
            },
            { $sort: { totalBookings: -1 } },
            { $limit: 10 }
        ]);

        return result;
    }

    public async findFilteredProviders(criteria: {
        providerIds: string[];
        userIdToExclude: string;
        lat?: number;
        long?: number;
        radius?: number;
        date?: string;  
        time?: string; 
    }): Promise<IProvider[]> {

        const baseFilter: mongoose.FilterQuery<IProvider> = {
            _id: { $in: criteria.providerIds },
            userId: { $ne: criteria.userIdToExclude },
        };


        if (criteria.lat && criteria.long && criteria.radius) {
            baseFilter['serviceLocation'] = {
                $geoWithin: {
                    $centerSphere: [
                        [criteria.long, criteria.lat],
                        criteria.radius / 6378.1, 
                    ],
                },
            };
        }

        let providers = await this.findAll(baseFilter);

        if (criteria.date || criteria.time) {
            const targetDate = criteria.date ? new Date(criteria.date) : new Date();
            const targetDay = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
            const targetTime = criteria.time;

            providers = providers.filter((provider) => {
                const { availability } = provider;
                if (!availability || !availability.weeklySchedule) return false;

                const isOnLeave = availability.leavePeriods?.some(
                    (period: any) => criteria.date >= period.from && criteria.date <= period.to
                );
                if (isOnLeave) return false;

                const override = availability.dateOverrides?.find(
                    (o: any) => o.date === criteria.date
                );
                if (override?.isUnavailable) return false;

                const daySchedule = availability.weeklySchedule.find((d: any) => d.day === targetDay && d.active);
                if (!daySchedule) return false;

                if (targetTime && daySchedule.slots?.length) {
                    return daySchedule.slots.some(
                        (slot: any) => targetTime >= slot.start && targetTime <= slot.end
                    );
                }

                return true;
            });

        }

        return providers;
    }

    public async getTopProvidersByEarnings(limit: number = 5): Promise<{ name: string; earnings: number }[]> {
        return this.model.find({}, 'fullName earnings')
            .sort({ earnings: -1 })
            .limit(limit)
            .lean()
            .then(providers => providers.map(p => ({ name: p.fullName, earnings: p.earnings || 0 })));
    }

    public async findProvidersByIdsAndSearch(
        providerIds: string[], 
        search?: string
    ): Promise<IProvider[]> {
        
        const filter: FilterQuery<IProvider> = {
             _id: { $in: providerIds.map(id => new Types.ObjectId(id)) }
        };

        if (search) {
            filter.fullName = { $regex: search, $options: 'i' };
        }

        return this.findAll(filter);
    }

}