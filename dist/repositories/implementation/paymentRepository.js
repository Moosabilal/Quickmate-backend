var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { injectable } from "inversify";
import Payment from "../../models/payment";
import { BaseRepository } from "./base/BaseRepository";
import { BookingStatus } from "../../enums/booking.enum";
let PaymentRepository = class PaymentRepository extends BaseRepository {
    constructor() {
        super(Payment);
    }
    async getMonthlyAdminRevenue() {
        const result = await Payment.aggregate([
            {
                $lookup: {
                    from: "bookings",
                    localField: "bookingId",
                    foreignField: "_id",
                    as: "booking",
                },
            },
            { $unwind: "$booking" },
            {
                $match: {
                    "booking.status": BookingStatus.COMPLETED,
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$paymentDate" },
                        month: { $month: "$paymentDate" },
                    },
                    total: { $sum: "$adminCommission" },
                },
            },
            {
                $project: {
                    _id: 0,
                    year: "$_id.year",
                    month: "$_id.month",
                    total: 1,
                },
            },
            { $sort: { year: 1, month: 1 } },
        ]);
        return result.map((r) => ({
            month: `${r.year}-${String(r.month).padStart(2, "0")}`,
            total: r.total,
        }));
    }
    async getTotalRevenue() {
        const result = await this.model.aggregate([
            { $match: { adminCommission: { $exists: true, $ne: null } } },
            { $group: { _id: null, totalRevenue: { $sum: "$adminCommission" } } },
        ]);
        return result[0]?.totalRevenue || 0;
    }
    async getTotalsInDateRange(startDate, endDate) {
        const result = await this.model.aggregate([
            {
                $match: {
                    paymentDate: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: null,
                    totalCommission: { $sum: "$adminCommission" },
                    totalProviderAmount: { $sum: "$providerAmount" },
                },
            },
        ]);
        if (result.length > 0) {
            return result[0];
        }
        return { totalCommission: 0, totalProviderAmount: 0 };
    }
};
PaymentRepository = __decorate([
    injectable(),
    __metadata("design:paramtypes", [])
], PaymentRepository);
export { PaymentRepository };
