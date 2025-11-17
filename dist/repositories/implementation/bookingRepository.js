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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingRepository = void 0;
const inversify_1 = require("inversify");
const Booking_1 = __importDefault(require("../../models/Booking"));
const BaseRepository_1 = require("./base/BaseRepository");
const mongoose_1 = require("mongoose");
const booking_enum_1 = require("../../enums/booking.enum");
let BookingRepository = class BookingRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super(Booking_1.default);
    }
    getDailyBookingCount() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield Booking_1.default.aggregate([
                {
                    $match: {
                        status: booking_enum_1.BookingStatus.COMPLETED
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                            day: { $dayOfMonth: "$createdAt" }
                        },
                        total: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        year: "$_id.year",
                        month: "$_id.month",
                        day: "$_id.day",
                        total: 1
                    }
                },
                { $sort: { year: 1, month: 1, day: 1 } }
            ]);
            return result.map(r => ({
                date: `${r.year}-${String(r.month).padStart(2, "0")}-${String(r.day).padStart(2, "0")}`,
                total: r.total
            }));
        });
    }
    findByProviderAndDateRange(providerIds_1, startDate_1, endDate_1) {
        return __awaiter(this, arguments, void 0, function* (providerIds, startDate, endDate, statuses = ['Pending', 'Confirmed', 'In_Progress']) {
            return yield Booking_1.default.find({
                providerId: { $in: providerIds },
                status: { $in: statuses },
                scheduledDate: {
                    $gte: startDate,
                    $lte: endDate
                }
            }).lean();
        });
    }
    findByProviderByTime(providerId_1, startDate_1, endDate_1) {
        return __awaiter(this, arguments, void 0, function* (providerId, startDate, endDate, statuses = ['Pending', 'Confirmed', 'In_Progress']) {
            return yield Booking_1.default.find({
                providerId,
                status: { $in: statuses },
                scheduledDate: {
                    $gte: startDate,
                    $lte: endDate
                }
            }).lean();
        });
    }
    findByProviderAndDateRangeForEarnings(providerId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            return Booking_1.default.find({
                providerId: new mongoose_1.Types.ObjectId(providerId),
                status: booking_enum_1.BookingStatus.COMPLETED,
                updatedAt: {
                    $gte: startDate,
                    $lte: endDate,
                },
            })
                .populate('userId', 'name')
                .populate('serviceId', 'title')
                .sort({ updatedAt: -1 })
                .lean();
        });
    }
    countUniqueClientsBeforeDate(providerId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            const distinctClients = yield Booking_1.default.distinct('userId', {
                providerId: new mongoose_1.Types.ObjectId(providerId),
                status: booking_enum_1.BookingStatus.COMPLETED,
                updatedAt: { $lt: date },
            });
            return distinctClients.length;
        });
    }
    hasPriorBooking(userId, providerId, beforeDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const bookingExists = yield Booking_1.default.exists({
                userId: userId,
                providerId: providerId,
                status: booking_enum_1.BookingStatus.COMPLETED,
                updatedAt: { $lt: beforeDate }
            });
            return !!bookingExists;
        });
    }
    getBookingStatsByService(providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = yield Booking_1.default.aggregate([
                { $match: { providerId: new mongoose_1.Types.ObjectId(providerId) } },
                {
                    $group: {
                        _id: "$serviceId",
                        total: { $sum: 1 },
                        completed: {
                            $sum: { $cond: [{ $eq: ["$status", booking_enum_1.BookingStatus.COMPLETED] }, 1, 0] }
                        }
                    }
                },
                {
                    $lookup: {
                        from: "services",
                        localField: "_id",
                        foreignField: "_id",
                        as: "serviceInfo"
                    }
                },
                { $unwind: "$serviceInfo" },
                {
                    $project: {
                        _id: 0,
                        serviceName: "$serviceInfo.title",
                        completed: "$completed",
                        total: "$total",
                        completionRate: {
                            $cond: [
                                { $eq: ["$total", 0] },
                                0,
                                { $multiply: [{ $divide: ["$completed", "$total"] }, 100] }
                            ]
                        }
                    }
                }
            ]);
            return stats.map(s => (Object.assign(Object.assign({}, s), { completionRate: parseFloat(s.completionRate.toFixed(1)) })));
        });
    }
    getBookingTrendsByMonth() {
        return __awaiter(this, arguments, void 0, function* (months = 7) {
            const monthsAgo = new Date();
            monthsAgo.setMonth(monthsAgo.getMonth() - months);
            const result = yield this.model.aggregate([
                { $match: { createdAt: { $gte: monthsAgo } } },
                {
                    $group: {
                        _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
                { $limit: months },
                {
                    $project: {
                        _id: 0,
                        month: {
                            $let: {
                                vars: { monthsInYear: ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] },
                                in: { $arrayElemAt: ["$$monthsInYear", "$_id.month"] }
                            }
                        },
                        value: "$count"
                    }
                }
            ]);
            return result;
        });
    }
    getBookingPatternsByDayOfWeek() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.model.aggregate([
                {
                    $group: {
                        _id: { $dayOfWeek: "$createdAt" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } },
                {
                    $project: {
                        _id: 0,
                        day: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ["$_id", 1] }, then: "Sun" }, { case: { $eq: ["$_id", 2] }, then: "Mon" },
                                    { case: { $eq: ["$_id", 3] }, then: "Tue" }, { case: { $eq: ["$_id", 4] }, then: "Wed" },
                                    { case: { $eq: ["$_id", 5] }, then: "Thu" }, { case: { $eq: ["$_id", 6] }, then: "Fri" },
                                    { case: { $eq: ["$_id", 7] }, then: "Sat" }
                                ],
                                default: "N/A"
                            }
                        },
                        value: "$count"
                    }
                }
            ]);
            return result;
        });
    }
    getTopServiceCategories() {
        return __awaiter(this, arguments, void 0, function* (limit = 5) {
            const result = yield this.model.aggregate([
                { $lookup: { from: 'services', localField: 'serviceId', foreignField: '_id', as: 'service' } },
                { $unwind: '$service' },
                { $lookup: { from: 'categories', localField: 'service.categoryId', foreignField: '_id', as: 'category' } },
                { $unwind: '$category' },
                { $group: { _id: '$category.name', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: limit },
                { $project: { _id: 0, name: '$_id', value: '$count' } }
            ]);
            return result;
        });
    }
    _buildHistorySearchPipeline(userId, search) {
        const pipeline = [
            { $lookup: { from: 'providers', localField: 'providerId', foreignField: '_id', as: 'provider' } },
            { $lookup: { from: 'services', localField: 'serviceId', foreignField: '_id', as: 'service' } },
            { $unwind: { path: '$provider', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
        ];
        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { 'service.title': { $regex: search, $options: 'i' } },
                        { 'provider.fullName': { $regex: search, $options: 'i' } }
                    ]
                }
            });
        }
        return pipeline;
    }
    findBookingsForUserHistory(userId, filters) {
        return __awaiter(this, void 0, void 0, function* () {
            const mainMatch = {
                $match: { userId: new mongoose_1.Types.ObjectId(userId) }
            };
            if (filters.status) {
                mainMatch.$match.status = filters.status;
            }
            const searchPipeline = this._buildHistorySearchPipeline(userId, filters.search);
            const aggregation = yield this.model.aggregate([
                mainMatch,
                ...searchPipeline,
                {
                    $facet: {
                        metadata: [{ $count: 'total' }],
                        data: [
                            { $sort: { createdAt: -1 } },
                            { $lookup: { from: 'addresses', localField: 'addressId', foreignField: '_id', as: 'address' } },
                            { $unwind: { path: '$address', preserveNullAndEmptyArrays: true } },
                            { $lookup: { from: 'categories', localField: 'service.subCategoryId', foreignField: '_id', as: 'subCategory' } },
                            { $unwind: { path: '$subCategory', preserveNullAndEmptyArrays: true } },
                            {
                                $project: {
                                    _id: 0,
                                    id: '$_id',
                                    serviceName: { $ifNull: ['$service.title', 'Unknown Service'] },
                                    serviceImage: { $ifNull: ['$subCategory.iconUrl', ''] },
                                    providerName: { $ifNull: ['$provider.fullName', 'Unknown Provider'] },
                                    providerImage: { $ifNull: ['$provider.profilePhoto', ''] },
                                    date: '$scheduledDate',
                                    time: '$scheduledTime',
                                    status: '$status',
                                    price: { $toDouble: "$amount" },
                                    location: { $concat: ["$address.street", ", ", "$address.city"] },
                                    priceUnit: '$service.priceUnit',
                                    duration: '$service.duration',
                                    description: '$instructions',
                                    createdAt: '$createdAt'
                                }
                            }
                        ]
                    }
                }
            ]);
            const bookings = aggregation[0].data;
            const total = aggregation[0].metadata[0] ? aggregation[0].metadata[0].total : 0;
            return { bookings, total };
        });
    }
    getBookingStatusCounts(userId, search) {
        return __awaiter(this, void 0, void 0, function* () {
            const searchPipeline = this._buildHistorySearchPipeline(userId, search);
            const aggregation = yield this.model.aggregate([
                { $match: { userId: new mongoose_1.Types.ObjectId(userId) } },
                ...searchPipeline,
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ]);
            return aggregation;
        });
    }
    getBookingsByFilter(userId, status, search) {
        return __awaiter(this, void 0, void 0, function* () {
            const mainMatch = {
                $match: { userId: new mongoose_1.Types.ObjectId(userId) }
            };
            if (status && status !== booking_enum_1.BookingStatus.All) {
                mainMatch.$match.status = status;
            }
            const searchPipeline = this._buildHistorySearchPipeline(userId, search);
            const aggregationPipeline = [
                mainMatch,
                ...searchPipeline,
                { $sort: { createdAt: -1 } }
            ];
            const bookings = yield this.model.aggregate(aggregationPipeline);
            return bookings;
        });
    }
    _buildProviderBookingSearchPipeline(search) {
        const pipeline = [
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $lookup: { from: 'services', localField: 'serviceId', foreignField: '_id', as: 'service' } },
            { $lookup: { from: 'addresses', localField: 'addressId', foreignField: '_id', as: 'address' } },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$address', preserveNullAndEmptyArrays: true } },
        ];
        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { 'service.title': { $regex: search, $options: 'i' } },
                        { 'user.name': { $regex: search, $options: 'i' } },
                        { 'customerName': { $regex: search, $options: 'i' } },
                        { 'address.city': { $regex: search, $options: 'i' } },
                        { 'address.street': { $regex: search, $options: 'i' } },
                    ]
                }
            });
        }
        return pipeline;
    }
    findBookingsForProvider(providerId, filters, page, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            const skip = (page - 1) * limit;
            const mainMatch = {
                $match: { providerId: new mongoose_1.Types.ObjectId(providerId) }
            };
            if (filters.status && filters.status !== booking_enum_1.BookingStatus.All) {
                mainMatch.$match.status = filters.status;
            }
            const searchPipeline = this._buildProviderBookingSearchPipeline(filters.search);
            const aggregation = yield this.model.aggregate([
                mainMatch,
                ...searchPipeline,
                {
                    $facet: {
                        metadata: [{ $count: 'total' }],
                        data: [
                            { $sort: { createdAt: -1 } },
                            { $skip: skip },
                            { $limit: limit },
                            { $lookup: { from: 'payments', localField: 'paymentId', foreignField: '_id', as: 'payment' } },
                            { $unwind: { path: '$payment', preserveNullAndEmptyArrays: true } },
                            {
                                $project: {
                                    _id: 0,
                                    id: '$_id',
                                    customerId: '$user._id',
                                    customerName: { $ifNull: ['$customerName', '$user.name'] },
                                    customerImage: { $ifNull: ['$user.profilePicture', ''] },
                                    service: { $ifNull: ['$service.title', 'Unknown Service'] },
                                    date: '$scheduledDate',
                                    time: '$scheduledTime',
                                    duration: '$service.duration',
                                    location: { $concat: ["$address.street", ", ", "$address.city"] },
                                    payment: { $ifNull: ['$payment.amount', 0] },
                                    paymentStatus: '$paymentStatus',
                                    status: '$status',
                                    description: '$service.description',
                                    customerPhone: '$phone',
                                    customerEmail: '$user.email',
                                    specialRequests: '$instructions',
                                    createdAt: '$createdAt'
                                }
                            }
                        ]
                    }
                }
            ]);
            const bookings = aggregation[0].data;
            const total = aggregation[0].metadata[0] ? aggregation[0].metadata[0].total : 0;
            return { bookings, total };
        });
    }
    getBookingStatusCountsForProvider(providerId, search) {
        return __awaiter(this, void 0, void 0, function* () {
            const searchPipeline = this._buildProviderBookingSearchPipeline(search);
            const aggregation = yield this.model.aggregate([
                { $match: { providerId: new mongoose_1.Types.ObjectId(providerId) } },
                ...searchPipeline,
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ]);
            return aggregation;
        });
    }
    countInDateRange(startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.countDocuments({
                createdAt: { $gte: startDate, $lte: endDate }
            });
        });
    }
};
exports.BookingRepository = BookingRepository;
exports.BookingRepository = BookingRepository = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], BookingRepository);
