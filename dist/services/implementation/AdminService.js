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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
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
exports.AdminService = void 0;
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../../di/type"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const booking_enum_1 = require("../../enums/booking.enum");
const userRoles_1 = require("../../enums/userRoles");
const admin_mapper_1 = require("../../utils/mappers/admin.mapper");
const CustomError_1 = require("../../utils/CustomError");
const ErrorMessage_1 = require("../../enums/ErrorMessage");
const HttpStatusCode_1 = require("../../enums/HttpStatusCode");
let AdminService = class AdminService {
    constructor(userRepository, bookingRepository, paymentRepository, providerRepository, reviewRepository) {
        this._userRepository = userRepository;
        ;
        this._bookingRepository = bookingRepository;
        this._paymentRepository = paymentRepository;
        this._providerRepository = providerRepository;
        this._reviewRepository = reviewRepository;
    }
    getAdminDashboard() {
        return __awaiter(this, void 0, void 0, function* () {
            const totalUsers = yield this._userRepository.countUsers();
            const totalProviders = yield this._userRepository.countUsers({ role: userRoles_1.Roles.PROVIDER });
            const dailyBookings = yield this._bookingRepository.getDailyBookingCount({ status: booking_enum_1.BookingStatus.COMPLETED });
            const monthlyRevenue = yield this._paymentRepository.getMonthlyAdminRevenue();
            const topActiveProviders = yield this._providerRepository.getTopActiveProviders();
            const providerReviewCounts = yield this._reviewRepository.getReviewCountsByProvider();
            const totalBookings = dailyBookings.reduce((acc, booking) => acc += booking.total, 0);
            return (0, admin_mapper_1.toAdminDashboardDTO)(totalUsers, totalProviders, totalBookings, dailyBookings, monthlyRevenue, topActiveProviders, providerReviewCounts);
        });
    }
    getDashboardAnalytics() {
        return __awaiter(this, void 0, void 0, function* () {
            const [topServiceCategoriesRaw, bookingTrends, weeklyPattern, topProviders, totalBookings, activeUsers, totalRevenue, averageRating] = yield Promise.all([
                this._bookingRepository.getTopServiceCategories(),
                this._bookingRepository.getBookingTrendsByMonth(),
                this._bookingRepository.getBookingPatternsByDayOfWeek(),
                this._providerRepository.getTopProvidersByEarnings(),
                this._bookingRepository.count({}),
                this._userRepository.getActiveUserCount(),
                this._paymentRepository.getTotalRevenue(),
                this._reviewRepository.getAverageRating()
            ]);
            const totalTopCategoryBookings = topServiceCategoriesRaw.reduce((sum, cat) => sum + cat.value, 0);
            const topServiceCategories = topServiceCategoriesRaw.map(cat => (Object.assign(Object.assign({}, cat), { value: totalTopCategoryBookings > 0 ? parseFloat(((cat.value / totalTopCategoryBookings) * 100).toFixed(1)) : 0 })));
            return {
                topServiceCategories,
                bookingTrends,
                weeklyPattern,
                topProviders,
                kpi: {
                    totalBookings,
                    activeUsers,
                    revenue: totalRevenue,
                    avgRating: parseFloat(averageRating.toFixed(1))
                }
            };
        });
    }
    changePassword(userId, currentPassword, newPassword) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this._userRepository.findByIdWithPassword(userId);
            if (!user) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.USER_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            const isMatch = yield bcryptjs_1.default.compare(currentPassword, user.password);
            if (!isMatch) {
                throw new CustomError_1.CustomError("Incorrect current password.", HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            user.password = newPassword;
            yield user.save();
        });
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.UserRepository)),
    __param(1, (0, inversify_1.inject)(type_1.default.BookingRepository)),
    __param(2, (0, inversify_1.inject)(type_1.default.PaymentRepository)),
    __param(3, (0, inversify_1.inject)(type_1.default.ProviderRepository)),
    __param(4, (0, inversify_1.inject)(type_1.default.ReviewRepository)),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object])
], AdminService);
