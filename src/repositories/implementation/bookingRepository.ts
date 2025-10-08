import { injectable } from "inversify";
import { IBookingRequest } from "../../interface/booking.dto";
import Booking, { IBooking } from "../../models/Booking";
import { IBookingRepository } from "../interface/IBookingRepository";
import { BaseRepository } from "./base/BaseRepository";
import { FilterQuery, Types } from "mongoose";
import { BookingStatus } from "../../enums/booking.enum";

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




}