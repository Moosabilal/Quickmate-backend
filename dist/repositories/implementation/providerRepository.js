var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import {} from "mongoose";
import { Types } from "mongoose";
import { Provider } from "../../models/Providers.js";
import {} from "../../interface/provider.js";
import {} from "../interface/IProviderRepository.js";
import { injectable } from "inversify";
import { BaseRepository } from "./base/BaseRepository.js";
let ProviderRepository = class ProviderRepository extends BaseRepository {
    constructor() {
        super(Provider);
    }
    async createProvider(data) {
        const provider = new Provider(data);
        await provider.save();
        return provider;
    }
    async findByEmail(email, includeOtpFields) {
        let query = Provider.findOne({ email });
        if (includeOtpFields) {
            query = query.select("+registrationOtp +registrationOtpExpires +registrationOtpAttempts");
        }
        return await query.exec();
    }
    async updateProvider(updateData) {
        const data = await Provider.findOneAndUpdate({ userId: updateData.userId }, updateData, { new: true });
        return data;
    }
    async getProviderByUserId(userId) {
        const data = await Provider.findOne({ userId: userId });
        return data;
    }
    async getAllProviders() {
        return await Provider.find({});
    }
    async findProvidersWithFilter(filter) {
        const mongooseQuery = this._buildQuery(filter);
        const page = filter.page || 1;
        const limit = filter.limit || 10;
        const skip = (page - 1) * limit;
        return await this.model.find(mongooseQuery).skip(skip).limit(limit).sort({ createdAt: -1 });
    }
    async countProviders(filter) {
        const mongooseQuery = this._buildQuery(filter);
        return await this.model.countDocuments(mongooseQuery);
    }
    async updateStatusById(id, newStatus) {
        await Provider.findByIdAndUpdate(id, { status: newStatus });
    }
    async getProviderByServiceId(filterQuery) {
        return await Provider.find(filterQuery);
    }
    async getProviderId(userId) {
        const provider = await Provider.findOne({ userId }).select("_id");
        return provider._id.toString();
    }
    async getTopActiveProviders() {
        const result = await Provider.aggregate([
            {
                $project: {
                    fullName: 1,
                    totalBookings: 1,
                    rating: 1,
                    profilePhoto: 1,
                },
            },
            { $sort: { totalBookings: -1 } },
            { $limit: 10 },
        ]);
        return result;
    }
    async findFilteredProviders(criteria) {
        const baseFilter = {
            _id: { $in: criteria.providerIds },
            userId: { $ne: criteria.userIdToExclude },
        };
        if (criteria.lat && criteria.long && criteria.radius) {
            baseFilter["serviceLocation"] = {
                $geoWithin: {
                    $centerSphere: [[criteria.long, criteria.lat], criteria.radius / 6378.1],
                },
            };
        }
        let providers = await this.findAll(baseFilter);
        if (criteria.date || criteria.time) {
            const targetDate = criteria.date ? new Date(criteria.date) : new Date();
            const targetDay = targetDate.toLocaleDateString("en-US", {
                weekday: "long",
            });
            const targetTime = criteria.time;
            providers = providers.filter((provider) => {
                const { availability } = provider;
                if (!availability || !availability.weeklySchedule)
                    return false;
                const isOnLeave = availability.leavePeriods?.some((period) => criteria.date >= period.from && criteria.date <= period.to);
                if (isOnLeave)
                    return false;
                const override = availability.dateOverrides?.find((o) => o.date === criteria.date);
                if (override?.isUnavailable)
                    return false;
                const daySchedule = availability.weeklySchedule.find((d) => d.day === targetDay && d.active);
                if (!daySchedule)
                    return false;
                if (targetTime && daySchedule.slots?.length) {
                    return daySchedule.slots.some((slot) => targetTime >= slot.start && targetTime <= slot.end);
                }
                return true;
            });
        }
        return providers;
    }
    async getTopProvidersByEarnings(limit = 5) {
        return this.model
            .find({}, "fullName earnings")
            .sort({ earnings: -1 })
            .limit(limit)
            .lean()
            .then((providers) => providers.map((p) => ({ name: p.fullName, earnings: p.earnings || 0 })));
    }
    async findProvidersByIdsAndSearch(providerIds, search) {
        const filter = {
            _id: { $in: providerIds.map((id) => new Types.ObjectId(id)) },
        };
        if (search) {
            filter.fullName = { $regex: search, $options: "i" };
        }
        return this.findAll(filter);
    }
    async removePastAvailability(cutoffDate) {
        const result = await Provider.updateMany({
            $or: [
                { "availability.dateOverrides.date": { $lte: cutoffDate } },
                { "availability.leavePeriods.to": { $lte: cutoffDate } },
            ],
        }, {
            $pull: {
                "availability.dateOverrides": { date: { $lte: cutoffDate } },
                "availability.leavePeriods": { to: { $lte: cutoffDate } },
            },
        });
        return result.modifiedCount;
    }
    _buildQuery(filter) {
        const query = {};
        if (filter.search) {
            query.$or = [
                { fullName: { $regex: filter.search, $options: "i" } },
                { email: { $regex: filter.search, $options: "i" } },
                { serviceName: { $regex: filter.search, $options: "i" } },
            ];
        }
        if (filter.status && filter.status !== "All") {
            query.status = filter.status;
        }
        if (filter.rating) {
            query.rating = { $gte: filter.rating, $lt: filter.rating + 1 };
        }
        return query;
    }
};
ProviderRepository = __decorate([
    injectable(),
    __metadata("design:paramtypes", [])
], ProviderRepository);
export { ProviderRepository };
