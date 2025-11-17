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
exports.PaymentRepository = void 0;
const inversify_1 = require("inversify");
const payment_1 = __importDefault(require("../../models/payment"));
const BaseRepository_1 = require("./base/BaseRepository");
const booking_enum_1 = require("../../enums/booking.enum");
let PaymentRepository = class PaymentRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super(payment_1.default);
    }
    getMonthlyAdminRevenue() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield payment_1.default.aggregate([
                {
                    $lookup: {
                        from: "bookings",
                        localField: "bookingId",
                        foreignField: "_id",
                        as: "booking"
                    }
                },
                { $unwind: "$booking" },
                {
                    $match: {
                        "booking.status": booking_enum_1.BookingStatus.COMPLETED
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$paymentDate" },
                            month: { $month: "$paymentDate" }
                        },
                        total: { $sum: "$adminCommission" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        year: "$_id.year",
                        month: "$_id.month",
                        total: 1
                    }
                },
                { $sort: { year: 1, month: 1 } }
            ]);
            return result.map(r => ({
                month: `${r.year}-${String(r.month).padStart(2, "0")}`,
                total: r.total
            }));
        });
    }
    getTotalRevenue() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield this.model.aggregate([
                { $match: { adminCommission: { $exists: true, $ne: null } } },
                { $group: { _id: null, totalRevenue: { $sum: '$adminCommission' } } }
            ]);
            return ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.totalRevenue) || 0;
        });
    }
    getTotalsInDateRange(startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.model.aggregate([
                {
                    $match: {
                        paymentDate: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalCommission: { $sum: "$adminCommission" },
                        totalProviderAmount: { $sum: "$providerAmount" }
                    }
                }
            ]);
            if (result.length > 0) {
                return result[0];
            }
            return { totalCommission: 0, totalProviderAmount: 0 };
        });
    }
};
exports.PaymentRepository = PaymentRepository;
exports.PaymentRepository = PaymentRepository = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], PaymentRepository);
