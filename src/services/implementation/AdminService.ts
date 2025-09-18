import { inject, injectable } from "inversify";
import { IUserRepository } from "../../repositories/interface/IUserRepository";
import { IAdminService } from "../interface/IAdminService";
import TYPES from "../../di/type";
import { IBookingRepository } from "../../repositories/interface/IBookingRepository";
import { BookingStatus } from "../../enums/booking.enum";
import { Roles } from "../../enums/userRoles";
import { IPaymentRepository } from "../../repositories/interface/IPaymentRepository";

@injectable()
export class AdminService implements IAdminService {
    private _userRepository: IUserRepository;
    private _bookingRepository: IBookingRepository;
    private _paymentRepository: IPaymentRepository;

    constructor(@inject(TYPES.UserRepository) userRepository: IUserRepository,
        @inject(TYPES.BookingRepository) bookingRepository: IBookingRepository,
        @inject(TYPES.ProviderRepository) paymentRepository: IPaymentRepository
    ) {
        this._userRepository = userRepository;
        this._bookingRepository = bookingRepository;
        this._paymentRepository = paymentRepository;
    }

    public async getAdminDashboard() {
        const totalUsers = await this._userRepository.countUsers()
        const totalProviders = await this._userRepository.countUsers({role: Roles.PROVIDER})
        const totalBookings = await this._bookingRepository.countBookings({status: BookingStatus.COMPLETED})
        const monthlyRevenue = await this._paymentRepository.getMonthlyAdminRevenue()
    }
}