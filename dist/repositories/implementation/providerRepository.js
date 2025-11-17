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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRepository = void 0;
const mongoose_1 = require("mongoose");
const Providers_1 = require("../../models/Providers");
const inversify_1 = require("inversify");
const BaseRepository_1 = require("./base/BaseRepository");
let ProviderRepository = class ProviderRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super(Providers_1.Provider);
    }
    createProvider(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = new Providers_1.Provider(data);
            yield provider.save();
            return provider;
        });
    }
    findByEmail(email, includeOtpFields) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = Providers_1.Provider.findOne({ email });
            if (includeOtpFields) {
                query = query.select('+registrationOtp +registrationOtpExpires +registrationOtpAttempts');
            }
            return yield query.exec();
        });
    }
    updateProvider(updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield Providers_1.Provider.findOneAndUpdate({ userId: updateData.userId }, updateData, { new: true });
            return data;
        });
    }
    getProviderByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield Providers_1.Provider.findOne({ userId: userId });
            return data;
        });
    }
    getAllProviders() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Providers_1.Provider.find({});
        });
    }
    findProvidersWithFilter(filter, skip, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Providers_1.Provider.find(filter)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });
        });
    }
    countProviders(filter) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Providers_1.Provider.countDocuments(filter);
        });
    }
    updateStatusById(id, newStatus) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Providers_1.Provider.findByIdAndUpdate(id, { status: newStatus });
        });
    }
    getProviderByServiceId(filterQuery) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Providers_1.Provider.find(filterQuery);
        });
    }
    getProviderId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = yield Providers_1.Provider.findOne({ userId }).select('_id');
            return provider._id.toString();
        });
    }
    getTopActiveProviders() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield Providers_1.Provider.aggregate([
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
        });
    }
    //     public async findFilteredProviders(criteria: {
    //     providerIds: string[];
    //     userIdToExclude: string;
    //     lat?: number;
    //     long?: number;
    //     radius?: number;
    //     date?: string; 
    //     time?: string; 
    // }): Promise<IProvider[]> {
    //     console.log('\n[DEBUG][findFilteredProviders] ▶️ Start');
    //     const filter: mongoose.FilterQuery<IProvider> = {
    //         _id: { $in: criteria.providerIds },
    //         userId: { $ne: criteria.userIdToExclude},
    //     };
    //     const testData = await this.findAll(filter)
    // console.log('Full data:', JSON.stringify(testData, null, 2));
    //     if (criteria.lat && criteria.long && criteria.radius) {
    //         filter.serviceLocation = {
    //             $geoWithin: {
    //                 $centerSphere: [
    //                     [criteria.long, criteria.lat],
    //                     criteria.radius / 6378.1, // Earth radius in km
    //                 ],
    //             },
    //         };
    //     }
    //     if (criteria.date || criteria.time) {
    //         filter.availability = { $elemMatch: {} as any };
    //         if (criteria.date) {
    //             const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    //             const dayOfWeek = days[new Date(criteria.date).getDay()];
    //             filter.availability.$elemMatch.day = dayOfWeek;
    //         }
    //         if (criteria.time) {
    //             filter.availability.$elemMatch.startTime = { $lte: criteria.time };
    //             filter.availability.$elemMatch.endTime = { $gte: criteria.time };
    //         }
    //     }
    //     const result = await this.findAll(filter);
    //     return result;
    // }
    findFilteredProviders(criteria) {
        return __awaiter(this, void 0, void 0, function* () {
            const baseFilter = {
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
            let providers = yield this.findAll(baseFilter);
            if (criteria.date || criteria.time) {
                const targetDate = criteria.date ? new Date(criteria.date) : new Date();
                const targetDay = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
                const targetTime = criteria.time;
                providers = providers.filter((provider) => {
                    var _a, _b, _c;
                    const { availability } = provider;
                    if (!availability || !availability.weeklySchedule)
                        return false;
                    const isOnLeave = (_a = availability.leavePeriods) === null || _a === void 0 ? void 0 : _a.some((period) => criteria.date >= period.from && criteria.date <= period.to);
                    if (isOnLeave)
                        return false;
                    const override = (_b = availability.dateOverrides) === null || _b === void 0 ? void 0 : _b.find((o) => o.date === criteria.date);
                    if (override === null || override === void 0 ? void 0 : override.isUnavailable)
                        return false;
                    const daySchedule = availability.weeklySchedule.find((d) => d.day === targetDay && d.active);
                    if (!daySchedule)
                        return false;
                    if (targetTime && ((_c = daySchedule.slots) === null || _c === void 0 ? void 0 : _c.length)) {
                        return daySchedule.slots.some((slot) => targetTime >= slot.start && targetTime <= slot.end);
                    }
                    return true;
                });
            }
            return providers;
        });
    }
    getTopProvidersByEarnings() {
        return __awaiter(this, arguments, void 0, function* (limit = 5) {
            return this.model.find({}, 'fullName earnings')
                .sort({ earnings: -1 })
                .limit(limit)
                .lean()
                .then(providers => providers.map(p => ({ name: p.fullName, earnings: p.earnings || 0 })));
        });
    }
    findProvidersByIdsAndSearch(providerIds, search) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = {
                _id: { $in: providerIds.map(id => new mongoose_1.Types.ObjectId(id)) }
            };
            if (search) {
                filter.fullName = { $regex: search, $options: 'i' };
            }
            return this.findAll(filter);
        });
    }
};
exports.ProviderRepository = ProviderRepository;
exports.ProviderRepository = ProviderRepository = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], ProviderRepository);
