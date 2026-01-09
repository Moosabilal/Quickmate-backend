import { injectable } from "inversify";
import {
  type IBookingHistoryPage,
  type IBookingStatusCount,
  type IPopulatedBookingForEarnings,
  type IProviderBookingManagement,
} from "../../interface/booking.js";
import Booking, { type BookingLean, type IBooking } from "../../models/Booking.js";
import { type IBookingRepository } from "../interface/IBookingRepository.js";
import { BaseRepository } from "./base/BaseRepository.js";
import { type ClientSession, type PipelineStage, Types } from "mongoose";
import { BookingStatus } from "../../enums/booking.enum.js";
import { type IServiceBreakdown } from "../../interface/provider.js";

@injectable()
export class BookingRepository extends BaseRepository<IBooking> implements IBookingRepository {
  constructor() {
    super(Booking);
  }

  async getDailyBookingCount(): Promise<{ date: string; total: number }[]> {
    const result = await Booking.aggregate([
      {
        $match: {
          status: BookingStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          total: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          day: "$_id.day",
          total: 1,
        },
      },
      { $sort: { year: 1, month: 1, day: 1 } },
    ]);

    return result.map((r) => ({
      date: `${r.year}-${String(r.month).padStart(2, "0")}-${String(r.day).padStart(2, "0")}`,
      total: r.total,
    }));
  }

  async findByProviderAndDateRange(
    providerIds: string[],
    startDate: string,
    endDate: string,
    statuses: string[] = ["Pending", "Confirmed", "In_Progress"],
  ): Promise<BookingLean[]> {
    return await Booking.find({
      providerId: { $in: providerIds },
      status: { $in: statuses },
      scheduledDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean<BookingLean[]>();
  }

  async findByProviderByTime(
    providerId: string,
    startDate: string,
    endDate: string,
    statuses: string[] = ["Pending", "Confirmed", "In_Progress"],
  ): Promise<BookingLean[]> {
    return await Booking.find({
      providerId,
      status: { $in: statuses },
      scheduledDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean<BookingLean[]>();
  }

  async findByProviderAndDateRangeForEarnings(
    providerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IPopulatedBookingForEarnings[]> {
    return Booking.find({
      providerId: new Types.ObjectId(providerId),
      status: BookingStatus.COMPLETED,
      updatedAt: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate("userId", "name")
      .populate<{ serviceId: { _id: string; title: string } }>("serviceId", "title")
      .sort({ updatedAt: -1 })
      .lean<IPopulatedBookingForEarnings[]>();
  }
  async countUniqueClientsBeforeDate(providerId: string, date: Date): Promise<number> {
    const distinctClients = await Booking.distinct("userId", {
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
      updatedAt: { $lt: beforeDate },
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
            $sum: {
              $cond: [{ $eq: ["$status", BookingStatus.COMPLETED] }, 1, 0],
            },
          },
        },
      },

      {
        $lookup: {
          from: "services",
          localField: "_id",
          foreignField: "_id",
          as: "serviceInfo",
        },
      },

      { $unwind: "$serviceInfo" },

      {
        $project: {
          _id: 0,
          serviceName: "$serviceInfo.title",
          completed: "$completed",
          total: "$total",
          completionRate: {
            $cond: [{ $eq: ["$total", 0] }, 0, { $multiply: [{ $divide: ["$completed", "$total"] }, 100] }],
          },
        },
      },
    ]);

    return stats.map((s) => ({
      ...s,
      completionRate: parseFloat(s.completionRate.toFixed(1)),
    }));
  }

  public async getBookingTrendsByMonth(months: number = 7): Promise<{ month: string; value: number }[]> {
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - months);

    const result = await this.model.aggregate([
      { $match: { createdAt: { $gte: monthsAgo } } },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: months },
      {
        $project: {
          _id: 0,
          month: {
            $let: {
              vars: {
                monthsInYear: ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
              },
              in: { $arrayElemAt: ["$$monthsInYear", "$_id.month"] },
            },
          },
          value: "$count",
        },
      },
    ]);
    return result;
  }

  public async getBookingPatternsByDayOfWeek(): Promise<{ day: string; value: number }[]> {
    const result = await this.model.aggregate([
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          day: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", 1] }, then: "Sun" },
                { case: { $eq: ["$_id", 2] }, then: "Mon" },
                { case: { $eq: ["$_id", 3] }, then: "Tue" },
                { case: { $eq: ["$_id", 4] }, then: "Wed" },
                { case: { $eq: ["$_id", 5] }, then: "Thu" },
                { case: { $eq: ["$_id", 6] }, then: "Fri" },
                { case: { $eq: ["$_id", 7] }, then: "Sat" },
              ],
              default: "N/A",
            },
          },
          value: "$count",
        },
      },
    ]);
    return result;
  }

  public async countTotalBookings(): Promise<number> {
    return this.model.countDocuments({ status: BookingStatus.COMPLETED });
  }

  public async getTopServiceCategories(limit: number = 5): Promise<{ name: string; value: number }[]> {
    const result = await this.model.aggregate([
      {
        $lookup: {
          from: "services",
          localField: "serviceId",
          foreignField: "_id",
          as: "service",
        },
      },
      { $unwind: "$service" },
      {
        $lookup: {
          from: "categories",
          localField: "service.categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      { $group: { _id: "$category.name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { _id: 0, name: "$_id", value: "$count" } },
    ]);
    return result;
  }

  private _buildHistorySearchPipeline(userId: string, search?: string): PipelineStage[] {
    const pipeline: PipelineStage[] = [
      {
        $lookup: {
          from: "providers",
          localField: "providerId",
          foreignField: "_id",
          as: "provider",
        },
      },
      {
        $lookup: {
          from: "services",
          localField: "serviceId",
          foreignField: "_id",
          as: "service",
        },
      },
      { $unwind: { path: "$provider", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "service.title": { $regex: search, $options: "i" } },
            { "provider.fullName": { $regex: search, $options: "i" } },
          ],
        },
      });
    }
    return pipeline;
  }

  public async findBookingsForUserHistory(
    userId: string,
    filters: { status?: BookingStatus; search?: string },
  ): Promise<{ bookings: IBookingHistoryPage[]; total: number }> {
    const mainMatch: PipelineStage.Match = {
      $match: { userId: new Types.ObjectId(userId) },
    };

    if (filters.status) {
      mainMatch.$match.status = filters.status;
    }

    const searchPipeline = this._buildHistorySearchPipeline(userId, filters.search);

    const aggregation = await this.model.aggregate([
      mainMatch,
      ...searchPipeline,
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: { createdAt: -1 } },
            {
              $lookup: {
                from: "addresses",
                localField: "addressId",
                foreignField: "_id",
                as: "address",
              },
            },
            { $unwind: { path: "$address", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "categories",
                localField: "service.subCategoryId",
                foreignField: "_id",
                as: "subCategory",
              },
            },
            {
              $unwind: {
                path: "$subCategory",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: 0,
                id: "$_id",
                serviceName: { $ifNull: ["$service.title", "Unknown Service"] },
                serviceImage: { $ifNull: ["$subCategory.iconUrl", ""] },
                providerName: {
                  $ifNull: ["$provider.fullName", "Unknown Provider"],
                },
                providerImage: { $ifNull: ["$provider.profilePhoto", ""] },
                date: "$scheduledDate",
                time: "$scheduledTime",
                status: "$status",
                price: { $toDouble: "$amount" },
                location: {
                  $concat: ["$address.street", ", ", "$address.city"],
                },
                priceUnit: "$service.priceUnit",
                duration: "$service.duration",
                description: "$instructions",
                createdAt: "$createdAt",
              },
            },
          ],
        },
      },
    ]);

    const bookings = aggregation[0].data;
    const total = aggregation[0].metadata[0] ? aggregation[0].metadata[0].total : 0;

    return { bookings, total };
  }

  public async getBookingStatusCounts(userId: string, search?: string): Promise<IBookingStatusCount[]> {
    const searchPipeline = this._buildHistorySearchPipeline(userId, search);

    const aggregation = await this.model.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      ...searchPipeline,
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    return aggregation;
  }

  public async getBookingsByFilter(userId: string, status: BookingStatus, search?: string): Promise<IBooking[]> {
    const mainMatch: PipelineStage.Match = {
      $match: { userId: new Types.ObjectId(userId) },
    };

    if (status && status !== BookingStatus.All) {
      mainMatch.$match.status = status;
    }

    const searchPipeline = this._buildHistorySearchPipeline(userId, search);

    const aggregationPipeline: PipelineStage[] = [mainMatch, ...searchPipeline, { $sort: { createdAt: -1 } }];

    const bookings = await this.model.aggregate(aggregationPipeline);

    return bookings;
  }

  private _buildProviderBookingSearchPipeline(search?: string): PipelineStage[] {
    const pipeline: PipelineStage[] = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $lookup: {
          from: "services",
          localField: "serviceId",
          foreignField: "_id",
          as: "service",
        },
      },
      {
        $lookup: {
          from: "addresses",
          localField: "addressId",
          foreignField: "_id",
          as: "address",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$address", preserveNullAndEmptyArrays: true } },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "service.title": { $regex: search, $options: "i" } },
            { "user.name": { $regex: search, $options: "i" } },
            { customerName: { $regex: search, $options: "i" } },
            { "address.city": { $regex: search, $options: "i" } },
            { "address.street": { $regex: search, $options: "i" } },
          ],
        },
      });
    }
    return pipeline;
  }

  public async findBookingsForProvider(
    providerId: string,
    filters: { status?: BookingStatus; search?: string },
    page: number,
    limit: number,
  ): Promise<{ bookings: IProviderBookingManagement[]; total: number }> {
    const skip = (page - 1) * limit;
    const mainMatch: PipelineStage.Match = {
      $match: { providerId: new Types.ObjectId(providerId) },
    };

    if (filters.status && filters.status !== BookingStatus.All) {
      mainMatch.$match.status = filters.status;
    }

    const searchPipeline = this._buildProviderBookingSearchPipeline(filters.search);

    const aggregation = await this.model.aggregate([
      mainMatch,
      ...searchPipeline,
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "payments",
                localField: "paymentId",
                foreignField: "_id",
                as: "payment",
              },
            },
            { $unwind: { path: "$payment", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                id: "$_id",
                customerId: "$user._id",
                customerName: { $ifNull: ["$customerName", "$user.name"] },
                customerImage: { $ifNull: ["$user.profilePicture", ""] },
                service: { $ifNull: ["$service.title", "Unknown Service"] },
                date: "$scheduledDate",
                time: "$scheduledTime",
                duration: "$service.duration",
                location: {
                  $concat: ["$address.street", ", ", "$address.city"],
                },
                payment: { $ifNull: ["$payment.amount", 0] },
                paymentStatus: "$paymentStatus",
                status: "$status",
                description: "$service.description",
                customerPhone: "$phone",
                customerEmail: "$user.email",
                specialRequests: "$instructions",
                createdAt: "$createdAt",
              },
            },
          ],
        },
      },
    ]);

    const bookings = aggregation[0].data;
    const total = aggregation[0].metadata[0] ? aggregation[0].metadata[0].total : 0;

    return { bookings, total };
  }

  public async getBookingStatusCountsForProvider(providerId: string, search?: string): Promise<IBookingStatusCount[]> {
    const searchPipeline = this._buildProviderBookingSearchPipeline(search);

    const aggregation = await this.model.aggregate([
      { $match: { providerId: new Types.ObjectId(providerId) } },
      ...searchPipeline,
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    return aggregation;
  }

  async countInDateRange(startDate: Date, endDate: Date): Promise<number> {
    return this.model.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });
  }

  async findOverdueBookings(cutoffDate: string): Promise<IBooking[]> {
    return this.model.find({
      status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      scheduledDate: { $lt: cutoffDate },
    });
  }

  async updateStatus(bookingId: string, status: BookingStatus): Promise<IBooking | null> {
    return this.model.findByIdAndUpdate(bookingId, { status: status }, { new: true });
  }

  async findByProviderAndDate(providerId: string, dateStr: string, session?: ClientSession): Promise<IBooking[]> {
    return await this.model
      .find({
        providerId: providerId,
        scheduledDate: dateStr,
        paymentStatus: { $ne: "FAILED" },
        status: { $ne: "CANCELLED" },
      })
      .session(session || null);
  }
}
