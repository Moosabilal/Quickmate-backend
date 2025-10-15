import { injectable } from "inversify";
import { IBookingRequest } from "../../interface/booking";
import Booking, { IBooking } from "../../models/Booking";
import { IBookingRepository } from "../interface/IBookingRepository";
import { BaseRepository } from "./base/BaseRepository";
import { FilterQuery, Types } from "mongoose";
import { BookingStatus } from "../../enums/booking.enum";
import { IServiceBreakdown } from "../../interface/provider";

@injectable()
export class BookingRepository extends BaseRepository<IBooking> implements IBookingRepository {
    constructor() {
        super(Booking)
    }

    async getDailyBookingCount(): Promise<{ date: string; total: number }[]> {
        const result = await Booking.aggregate([
            {
                $match: {
                    status: BookingStatus.COMPLETED
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
    }

    async findByProviderAndDateRange(
        providerIds: string[],
        startDate: string,
        endDate: string,
        statuses: string[] = ['Pending', 'Confirmed', 'In_Progress']
    ): Promise<IBooking[]> {
        return await Booking.find({
            providerId: { $in: providerIds },
            status: { $in: statuses },
            scheduledDate: {
                $gte: startDate,
                $lte: endDate
            }
        }).lean();
    }

    async findByProviderByTime(
        providerId: string,
        startDate: string,
        endDate: string,
        statuses: string[] = ['Pending', 'Confirmed', 'In_Progress']
    ) {
        return await Booking.find({
            providerId,
            status: { $in: statuses },
            scheduledDate: {
                $gte: startDate,
                $lte: endDate
            }
        }).lean();
    }

    async findByProviderAndDateRangeForEarnings(
        providerId: string,
        startDate: Date,
        endDate: Date
    ): Promise<IBooking[]> {
        return Booking.find({
            providerId: new Types.ObjectId(providerId),
            status: BookingStatus.COMPLETED,
            updatedAt: {
                $gte: startDate,
                $lte: endDate,
            },
        })
            .populate('userId', 'name')
            .populate('serviceId', 'title')
            .sort({ updatedAt: -1 }) 
            .lean();
    }
    async countUniqueClientsBeforeDate(providerId: string, date: Date): Promise<number> {
        const distinctClients = await Booking.distinct('userId', {
            providerId: new Types.ObjectId(providerId),
            status: BookingStatus.COMPLETED,
            updatedAt: { $lt: date },
        });
        return distinctClients.length;
    }

    public async hasPriorBooking(userId: string, providerId: string, beforeDate: Date): Promise<boolean> {
        const bookingExists = await Booking.exists({
            userId: userId,
            providerId: providerId,
            status: BookingStatus.COMPLETED,
            updatedAt: { $lt: beforeDate }
        });
        return !!bookingExists;
    }

    async getBookingStatsByService(providerId: string): Promise<IServiceBreakdown[]> {
        const stats = await Booking.aggregate([
            { $match: { providerId: new Types.ObjectId(providerId) } },
            
            {
                $group: {
                    _id: "$serviceId",
                    total: { $sum: 1 },
                    completed: {
                        $sum: { $cond: [{ $eq: ["$status", BookingStatus.COMPLETED] }, 1, 0] }
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

        return stats.map(s => ({
            ...s,
            completionRate: parseFloat(s.completionRate.toFixed(1))
        }));
    }

    public async getBookingTrendsByMonth(months: number = 7): Promise<{ month: string; value: number }[]> {
        const monthsAgo = new Date();
        monthsAgo.setMonth(monthsAgo.getMonth() - months);

        const result = await this.model.aggregate([
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
    }

    public async getBookingPatternsByDayOfWeek(): Promise<{ day: string; value: number }[]> {
        const result = await this.model.aggregate([
            {
                $group: {
                    _id: { $dayOfWeek: "$createdAt" }, // Sunday=1, Monday=2, ...
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
    }

    public async getTopServiceCategories(limit: number = 5): Promise<{ name: string; value: number }[]> {
        const result = await this.model.aggregate([
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
    }




}