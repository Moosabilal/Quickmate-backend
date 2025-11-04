import { inject, injectable } from "inversify";
import { IUserRepository } from "../../repositories/interface/IUserRepository";
import { IAdminService } from "../interface/IAdminService";
import TYPES from "../../di/type";
import { IBookingRepository } from "../../repositories/interface/IBookingRepository";
import { BookingStatus } from "../../enums/booking.enum";
import { Roles } from "../../enums/userRoles";
import { IPaymentRepository } from "../../repositories/interface/IPaymentRepository";
import { IProviderRepository } from "../../repositories/interface/IProviderRepository";
import { IReviewRepository } from "../../repositories/interface/IReviewRepository";
import { toAdminDashboardDTO } from "../../utils/mappers/admin.mapper";
import { IProviderDashboardRes } from "../../interface/provider";
import { IAnalyticsData } from "../../interface/admin";

@injectable()
export class AdminService implements IAdminService {
    private _userRepository: IUserRepository;
    private _bookingRepository: IBookingRepository;
    private _paymentRepository: IPaymentRepository;
    private _providerRepository: IProviderRepository;
    private _reviewRepository: IReviewRepository;

    constructor(@inject(TYPES.UserRepository) userRepository: IUserRepository,
        @inject(TYPES.BookingRepository) bookingRepository: IBookingRepository,
        @inject(TYPES.PaymentRepository) paymentRepository: IPaymentRepository,
        @inject(TYPES.ProviderRepository) providerRepository: IProviderRepository,
        @inject(TYPES.ReviewRepository) reviewRepository: IReviewRepository
    ) {
        this._userRepository = userRepository;;
        this._bookingRepository = bookingRepository;
        this._paymentRepository = paymentRepository;
        this._providerRepository = providerRepository;
        this._reviewRepository = reviewRepository;
    }

    public async getAdminDashboard(): Promise<IProviderDashboardRes> {
        const totalUsers = await this._userRepository.countUsers()
        const totalProviders = await this._userRepository.countUsers({role: Roles.PROVIDER})
        const dailyBookings = await this._bookingRepository.getDailyBookingCount({status: BookingStatus.COMPLETED})
        const monthlyRevenue = await this._paymentRepository.getMonthlyAdminRevenue()
        const topActiveProviders = await this._providerRepository.getTopActiveProviders()
        const providerReviewCounts = await this._reviewRepository.getReviewCountsByProvider()
        const totalBookings = dailyBookings.reduce((acc,booking) => acc += booking.total, 0)

        return toAdminDashboardDTO(totalUsers, totalProviders, totalBookings, dailyBookings, monthlyRevenue, topActiveProviders, providerReviewCounts)

    }

    public async getDashboardAnalytics(): Promise<IAnalyticsData> {
        const [
            topServiceCategoriesRaw,
            bookingTrends,
            weeklyPattern,
            topProviders,
            totalBookings,
            activeUsers,
            totalRevenue,
            averageRating
        ] = await Promise.all([
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
        const topServiceCategories = topServiceCategoriesRaw.map(cat => ({
            ...cat,
            value: totalTopCategoryBookings > 0 ? parseFloat(((cat.value / totalTopCategoryBookings) * 100).toFixed(1)) : 0
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
                avgRating: parseFloat(averageRating.toFixed(1))
            }
        };
    }
}