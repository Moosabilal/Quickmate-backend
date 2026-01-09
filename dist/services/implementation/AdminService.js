var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { inject, injectable } from "inversify";
import {} from "../../repositories/interface/IUserRepository.js";
import {} from "../interface/IAdminService.js";
import TYPES from "../../di/type.js";
import bcrypt from "bcryptjs";
import {} from "../../repositories/interface/IBookingRepository.js";
import { BookingStatus } from "../../enums/booking.enum.js";
import { Roles } from "../../enums/userRoles.js";
import {} from "../../repositories/interface/IPaymentRepository.js";
import {} from "../../repositories/interface/IProviderRepository.js";
import {} from "../../repositories/interface/IReviewRepository.js";
import { toAdminDashboardDTO } from "../../utils/mappers/admin.mapper.js";
import {} from "../../interface/provider.js";
import {} from "../../interface/admin.js";
import { CustomError } from "../../utils/CustomError.js";
import { ErrorMessage } from "../../enums/ErrorMessage.js";
import { HttpStatusCode } from "../../enums/HttpStatusCode.js";
let AdminService = class AdminService {
    _userRepository;
    _bookingRepository;
    _paymentRepository;
    _providerRepository;
    _reviewRepository;
    constructor(userRepository, bookingRepository, paymentRepository, providerRepository, reviewRepository) {
        this._userRepository = userRepository;
        this._bookingRepository = bookingRepository;
        this._paymentRepository = paymentRepository;
        this._providerRepository = providerRepository;
        this._reviewRepository = reviewRepository;
    }
    async getAdminDashboard() {
        const totalUsers = await this._userRepository.countUsers();
        const totalProviders = await this._userRepository.countUsers({
            role: Roles.PROVIDER,
        });
        const dailyBookings = await this._bookingRepository.getDailyBookingCount({
            status: BookingStatus.COMPLETED,
        });
        const monthlyRevenue = await this._paymentRepository.getMonthlyAdminRevenue();
        const topActiveProviders = await this._providerRepository.getTopActiveProviders();
        const providerReviewCounts = await this._reviewRepository.getReviewCountsByProvider();
        const totalBookings = dailyBookings.reduce((acc, booking) => (acc += booking.total), 0);
        return toAdminDashboardDTO(totalUsers, totalProviders, totalBookings, dailyBookings, monthlyRevenue, topActiveProviders, providerReviewCounts);
    }
    async getDashboardAnalytics() {
        const [topServiceCategoriesRaw, bookingTrends, weeklyPattern, topProviders, totalBookings, activeUsers, totalRevenue, averageRating,] = await Promise.all([
            this._bookingRepository.getTopServiceCategories(),
            this._bookingRepository.getBookingTrendsByMonth(),
            this._bookingRepository.getBookingPatternsByDayOfWeek(),
            this._providerRepository.getTopProvidersByEarnings(),
            this._bookingRepository.countTotalBookings(),
            this._userRepository.getActiveUserCount(),
            this._paymentRepository.getTotalRevenue(),
            this._reviewRepository.getAverageRating(),
        ]);
        const totalTopCategoryBookings = topServiceCategoriesRaw.reduce((sum, cat) => sum + cat.value, 0);
        const topServiceCategories = topServiceCategoriesRaw.map((cat) => ({
            ...cat,
            value: totalTopCategoryBookings > 0 ? parseFloat(((cat.value / totalTopCategoryBookings) * 100).toFixed(1)) : 0,
        }));
        return {
            topServiceCategories,
            bookingTrends,
            weeklyPattern,
            topProviders,
            kpi: {
                totalBookings,
                activeUsers,
                revenue: totalRevenue,
                avgRating: parseFloat(averageRating.toFixed(1)),
            },
        };
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this._userRepository.findByIdWithPassword(userId);
        if (!user) {
            throw new CustomError(ErrorMessage.USER_NOT_FOUND, HttpStatusCode.NOT_FOUND);
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            throw new CustomError("Incorrect current password.", HttpStatusCode.BAD_REQUEST);
        }
        user.password = newPassword;
        await user.save();
    }
};
AdminService = __decorate([
    injectable(),
    __param(0, inject(TYPES.UserRepository)),
    __param(1, inject(TYPES.BookingRepository)),
    __param(2, inject(TYPES.PaymentRepository)),
    __param(3, inject(TYPES.ProviderRepository)),
    __param(4, inject(TYPES.ReviewRepository)),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object])
], AdminService);
export { AdminService };
