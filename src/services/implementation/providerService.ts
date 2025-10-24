import { inject, injectable } from "inversify";
import { IProviderRepository } from "../../repositories/interface/IProviderRepository";
import { IProviderService } from "../interface/IProviderService";
import TYPES from "../../di/type";
import mongoose from "mongoose";
import { IProvider } from "../../models/Providers";
import { EarningsAnalyticsData, IAvailabilityUpdateData, IBackendProvider, IDashboardResponse, IDashboardStatus, IFeaturedProviders, IProviderForAdminResponce, IProviderForChatListPage, IProviderPerformance, IProviderProfile, IProviderRegistrationData, IReviewsOfUser, IServiceAddPageResponse, TimeSlot } from "../../interface/provider";
import { ICategoryRepository } from "../../repositories/interface/ICategoryRepository";
import jwt, { JwtPayload } from 'jsonwebtoken'
import { HttpStatusCode } from "../../enums/HttpStatusCode";
import { ErrorMessage } from "../../enums/ErrorMessage";
import { CustomError } from "../../utils/CustomError";
import { generateOTP } from "../../utils/otpGenerator";
import { sendVerificationEmail } from "../../utils/emailService";
import { ILoginResponseDTO, ResendOtpRequestBody, VerifyOtpRequestBody } from "../../interface/auth";
import { IUserRepository } from "../../repositories/interface/IUserRepository";
import { Roles } from "../../enums/userRoles";
import { toBackendProviderDTO, toClientForChatListPage, toEarningsAnalyticsDTO, toProviderDashboardDTO, toProviderDTO, toProviderForAdminResponseDTO, toProviderForChatListPage, toProviderPerformanceDTO, toServiceAddPage } from "../../utils/mappers/provider.mapper";
import { toLoginResponseDTO } from "../../utils/mappers/user.mapper";
import { ProviderStatus } from "../../enums/provider.enum";
import { IServiceRepository } from "../../repositories/interface/IServiceRepository";
import { IBookingRepository } from "../../repositories/interface/IBookingRepository";
import { IMessageRepository } from "../../repositories/interface/IMessageRepository";
import { IReviewRepository } from "../../repositories/interface/IReviewRepository";
import { calendar_v3 } from 'googleapis';
import { convertTo24Hour } from "../../utils/helperFunctions/convertTo24hrs";
import { endOfMonth } from "date-fns/endOfMonth";
import { endOfWeek } from "date-fns/endOfWeek";
import { startOfMonth } from "date-fns/startOfMonth";
import { startOfWeek } from "date-fns/startOfWeek";
import { sub } from "date-fns/sub";
import { _haversineKm } from "../../utils/helperFunctions/haversineKm";
import { format } from 'date-fns/format';
import { addDays } from 'date-fns/addDays';
import { IBooking } from "../../models/Booking";

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5;
const MAX_OTP_ATTEMPTS = parseInt(process.env.MAX_OTP_ATTEMPTS, 10) || 5;
const RESEND_COOLDOWN_SECONDS = parseInt(process.env.RESEND_COOLDOWN_SECONDS, 10) || 30;


@injectable()
export class ProviderService implements IProviderService {
    private _providerRepository: IProviderRepository
    private _serviceRepository: IServiceRepository;
    private _userRepository: IUserRepository
    private _categoryRepository: ICategoryRepository;
    private _bookingRepository: IBookingRepository
    private _messageRepository: IMessageRepository;
    private _reviewRepository: IReviewRepository;

    constructor(@inject(TYPES.ProviderRepository) providerRepository: IProviderRepository,
        @inject(TYPES.ServiceRepository) serviceRepository: IServiceRepository,
        @inject(TYPES.UserRepository) userRepository: IUserRepository,
        @inject(TYPES.CategoryRepository) categoryRepository: ICategoryRepository,
        @inject(TYPES.BookingRepository) bookingRepository: IBookingRepository,
        @inject(TYPES.MessageRepository) messageRepository: IMessageRepository,
        @inject(TYPES.ReviewRepository) reviewRepository: IReviewRepository,
    ) {
        this._providerRepository = providerRepository
        this._serviceRepository = serviceRepository
        this._userRepository = userRepository
        this._categoryRepository = categoryRepository
        this._bookingRepository = bookingRepository
        this._messageRepository = messageRepository;
        this._reviewRepository = reviewRepository;
    }

    public async registerProvider(data: IProviderRegistrationData): Promise<{ message: string, email: string }> {

        let provider = await this._providerRepository.findByEmail(data.email);


        if (provider && provider.isVerified && provider.status !== ProviderStatus.REJECTED) {
            throw new CustomError(ErrorMessage.USER_ALREADY_EXISTS, HttpStatusCode.CONFLICT)
        }

        if (!provider) {
            provider = await this._providerRepository.createProvider(data);
        } else if (provider && provider.status === ProviderStatus.REJECTED) {
            provider = await this._providerRepository.updateProvider(data)
        } else {
            provider.fullName = data.fullName;
            provider.phoneNumber = data.phoneNumber;
            provider.isVerified = false;
        }

        const otp = generateOTP();

        provider.registrationOtp = otp;
        provider.registrationOtpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        provider.registrationOtpAttempts = 0;
        await this._providerRepository.update(provider.id, provider);
        await sendVerificationEmail(provider.email, otp);


        return {
            message: 'Registration successful! An OTP has been sent to your email for verification.',
            email: String(provider.email),
        }
    }

    public async verifyOtp(data: VerifyOtpRequestBody): Promise<{ provider?: IProviderProfile, user?: ILoginResponseDTO, message?: string }> {
        const { email, otp } = data;

        const provider = await this._providerRepository.findByEmail(email, true);

        if (!provider) {
            throw new CustomError(ErrorMessage.USER_NOT_FOUND, HttpStatusCode.NOT_FOUND)
        }
        if (provider.isVerified) {
            throw new CustomError('Account already verified.', HttpStatusCode.CONFLICT);
        }
        if (typeof provider.registrationOtpAttempts === 'number' && provider.registrationOtpAttempts >= MAX_OTP_ATTEMPTS) {
            throw new CustomError(`Too many failed OTP attempts. Please request a new OTP.`, HttpStatusCode.FORBIDDEN);
        }
        if (!provider.registrationOtp || provider.registrationOtp !== otp) {
            await this._providerRepository.update(provider.id, { $inc: { registrationOtpAttempts: 1 } });
            throw new CustomError('Invalid OTP. Please try again.', HttpStatusCode.BAD_REQUEST);
        }
        if (!provider.registrationOtpExpires || new Date() > provider.registrationOtpExpires) {
            throw new CustomError('OTP has expired. Please request a new one.', HttpStatusCode.BAD_REQUEST);
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const providerUpdatePayload = {
                isVerified: true,
                status: ProviderStatus.PENDING,
                registrationOtp: undefined,
                registrationOtpExpires: undefined,
                registrationOtpAttempts: 0,
            };
            const updatedProvider = await this._providerRepository.update(provider.id, providerUpdatePayload, { session });

            if (!updatedProvider) {
                throw new CustomError("Failed to update provider record.", HttpStatusCode.INTERNAL_SERVER_ERROR);
            }

            const userUpdatePayload = {
                role: Roles.PROVIDER
            };
            const updatedUser = await this._userRepository.update(provider.userId.toString(), userUpdatePayload, { session });

            if (!updatedUser) {
                throw new CustomError("Failed to update user role.", HttpStatusCode.INTERNAL_SERVER_ERROR);
            }

            await session.commitTransaction();

            return {
                provider: toProviderDTO(updatedProvider),
                user: toLoginResponseDTO(updatedUser)
            };

        } catch (error) {
            await session.abortTransaction();
        } finally {
            session.endSession();
        }
    }

    public async resendOtp(data: ResendOtpRequestBody): Promise<{ message: string }> {
        const { email } = data;

        const provider = await this._providerRepository.findByEmail(email, true);

        if (!provider) {
            return { message: 'If an account with this email exists, a new OTP has been sent.' };
        }

        if (provider.isVerified) {
            return { message: 'Account already verified. Please proceed to login.' };
        }

        if (provider.registrationOtpExpires && provider.registrationOtpExpires instanceof Date) {
            const timeSinceLastOtpSent = Date.now() - (provider.registrationOtpExpires.getTime() - (OTP_EXPIRY_MINUTES * 60 * 1000));
            if (timeSinceLastOtpSent < RESEND_COOLDOWN_SECONDS * 1000) {
                const error = new Error(`Please wait ${RESEND_COOLDOWN_SECONDS - Math.floor(timeSinceLastOtpSent / 1000)} seconds before requesting another OTP.`);
                (error as any).statusCode = 429;
                throw error;
            }
        }

        const newOtp = generateOTP();
        provider.registrationOtp = newOtp;
        provider.registrationOtpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        provider.registrationOtpAttempts = 0;

        await this._providerRepository.update(provider.id, provider);

        await sendVerificationEmail(email, newOtp);

        return { message: 'A new OTP has been sent to your email.' };
    }

    public async updateProviderDetails(updateData: Partial<IProviderRegistrationData>): Promise<IProviderProfile> {
        const updatedProvider = await this._providerRepository.updateProvider(updateData);

        if (!updatedProvider) {
            throw new CustomError("Provider not found or failed to update.", HttpStatusCode.NOT_FOUND);
        }

        return toProviderDTO(updatedProvider);
    }


    public async getProviderWithAllDetails(): Promise<IProvider[]> {
        return this._providerRepository.getAllProviders();
    }

    public async providersForAdmin(
        page: number,
        limit: number,
        search: string,
        status: string
    ): Promise<{
        data: IProviderForAdminResponce[];
        total: number;
        totalPages: number;
        currentPage: number;
    }> {
        const skip = (page - 1) * limit;

        const filter: any = {
            $or: [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ],
        };

        if (status && status !== 'All') {
            filter.status = status;
        }

        const [providers, total] = await Promise.all([
            this._providerRepository.findProvidersWithFilter(filter, skip, limit),
            this._providerRepository.countProviders(filter),
        ]);

        if (!providers || providers.length === 0) {
            throw new CustomError('No providers found.', HttpStatusCode.NOT_FOUND);
        }

        const providerIds = providers.map(p => p._id);
        const services = await this._serviceRepository.findAll({ providerId: { $in: providerIds } });

        const serviceMap = new Map<string, string[]>();
        for (const service of services) {
            const key = service.providerId.toString();
            if (!serviceMap.has(key)) {
                serviceMap.set(key, []);
            }
            serviceMap.get(key)!.push(service.title);
        }

        const data = toProviderForAdminResponseDTO(providers, serviceMap);

        return {
            data,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }

    public async getServicesForAddservice(): Promise<{ mainCategories: IServiceAddPageResponse[], services: IServiceAddPageResponse[] }> {
        const categories = await this._categoryRepository.getAllCategories()
        const mainCategories = categories.filter(category => !category.parentId).map(category => toServiceAddPage(category))
        const services = categories.filter(category => !!category.parentId).map(category => toServiceAddPage(category))
        return {
            mainCategories,
            services
        }
    }

    public async fetchProviderById(token: string): Promise<IProviderProfile> {
        if (!token) {
            throw new CustomError(ErrorMessage.MISSING_TOKEN, HttpStatusCode.UNAUTHORIZED);
        }
        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
        } catch (error) {
            throw new CustomError('Invalid or expired token.', HttpStatusCode.UNAUTHORIZED);
        }

        const provider = await this._providerRepository.getProviderByUserId(decoded.id);

        if (!provider) {
            throw new CustomError("Provider profile not found for this user.", HttpStatusCode.NOT_FOUND);
        }

        return toProviderDTO(provider);
    }

    public async getFeaturedProviders(page: number, limit: number, search: string): Promise<{ providers: IFeaturedProviders[], total: number, totalPages: number, currentPage: number }> {
        const skip = (page - 1) * limit;

        const filter: any = {
            $or: [
                { fullName: { $regex: search, $options: 'i' } },
                { serviceName: { $regex: search, $options: 'i' } },
            ]
        }
        const providers = await this._providerRepository.findProvidersWithFilter(filter, skip, limit);
        const total = await this._providerRepository.countProviders(filter)

        const featuredProviders = providers.map(provider => ({
            id: provider._id.toString(),
            userId: provider.userId.toString(),
            fullName: provider.fullName,
            profilePhoto: provider.profilePhoto,

        }))

        return {
            providers: featuredProviders,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        }
    }

    public async updateProviderStat(id: string, newStatus: string): Promise<{ message: string }> {
        if (!newStatus) {
            throw new CustomError('Status is required', HttpStatusCode.BAD_REQUEST);
        }

        const allowedStatuses = Object.values(ProviderStatus);
        if (!allowedStatuses.includes(newStatus as ProviderStatus)) {
            throw new CustomError(`Invalid status. Allowed: ${allowedStatuses.join(", ")}`, HttpStatusCode.BAD_REQUEST);
        }
        await this._providerRepository.updateStatusById(id, newStatus)
        return { message: "provider Status updated" }
    }



    public async getProviderwithFilters(
        userId: string,
        subCategoryId: string,
        filters: {
            radius: number;
            lat: number;
            long: number;
            experience?: number;
            date?: string;
            time?: string;
            price?: number;
        }
    ): Promise<IBackendProvider[]> {

        const initialProviders = await this._getProvidersByInitialCriteria(subCategoryId, userId, filters);
        if (initialProviders.length === 0) return [];

        const availableProviders = await this._filterProvidersByBookingConflicts(initialProviders, filters);
        if (availableProviders.length === 0) return [];

        const enrichedProviders = await this._enrichProvidersWithDetails(availableProviders, subCategoryId, filters);

        enrichedProviders.sort((a, b) => a.distanceKm - b.distanceKm);

        const enrichedMap = enrichedProviders.map(p => ({
            id: p._id,
            name: p.fullName,
            phone: p.phoneNumber,
            email: p.email,
            experience: p.experience,
            price: p.price,
            distanceKm: p.distanceKm,
            totalBookings: p.totalBookings,
            earnings: p.earnings,
            reviewsCount: p.reviews?.length || 0,
            serviceName: p.serviceName,
            status: p.status,
            availability: p.availability?.length || 0,
        }));
        console.table(enrichedMap);

        return enrichedProviders;
    }



    public async providerForChatPage(userId: string): Promise<IProviderForChatListPage[]> {
        if (!userId) {
            throw new CustomError("Sorry, UserId not found", HttpStatusCode.NOT_FOUND);
        }

        const user = await this._userRepository.findById(userId);
        if (!user) {
            throw new CustomError("User not found", HttpStatusCode.NOT_FOUND);
        }

        if (user.role === Roles.PROVIDER) {

            const providerProfile = await this._providerRepository.findOne({ userId });
            if (!providerProfile) return [];

            const bookings = await this._bookingRepository.findAll({ providerId: providerProfile._id });
            if (!bookings.length) return [];

            const clientIds = [...new Set(bookings.map(b => b.userId?.toString()).filter(Boolean))];
            const clients = await this._userRepository.findAll({ _id: { $in: clientIds } });

            const serviceIds = bookings.map(b => b.serviceId?.toString()).filter(Boolean);
            const services = await this._serviceRepository.findAll({ _id: { $in: serviceIds } });
            const bookingIds = bookings.map(b => b._id.toString());
            const messages = await this._messageRepository.findLastMessagesByBookingIds(bookingIds);

            return toClientForChatListPage(bookings, clients, services, messages);

        } else {

            const bookings = await this._bookingRepository.findAll({ userId });
            if (!bookings.length) return [];

            const providerIds = [...new Set(bookings.map(b => b.providerId?.toString()).filter(Boolean))];
            const providers = await this._providerRepository.findAll({ _id: { $in: providerIds } });

            const serviceIds = bookings.map(b => b.serviceId?.toString()).filter(Boolean);
            const services = await this._serviceRepository.findAll({ _id: { $in: serviceIds } });
            const bookingIds = bookings.map(b => b._id.toString());
            const messages = await this._messageRepository.findLastMessagesByBookingIds(bookingIds);

            return toProviderForChatListPage(bookings, providers, services, messages);
        }
    }


    public async getProviderDashboard(
        userId: string
    ): Promise<{ dashboardData: IDashboardResponse[]; dashboardStat: IDashboardStatus }> {
        const provider = await this._providerRepository.findOne({ userId });
        if (!provider) throw new CustomError("Provider not found", 404);

        const bookings = await this._bookingRepository.findAll({
            providerId: provider._id.toString(),
        });

        const serviceIds = [...new Set(bookings.map((b) => b.serviceId?.toString()))];
        const services = await this._serviceRepository.findAll({
            _id: { $in: serviceIds },
        });

        const subCategoryIds = [...new Set(services.map((s) => s.subCategoryId.toString()))];
        const subCategories = await this._categoryRepository.findAll({
            _id: { $in: subCategoryIds },
        });

        const parentCategoryIds = [...new Set(subCategories.map((sc) => sc.parentId.toString()))];
        const parentCategories = await this._categoryRepository.findAll({
            _id: { $in: parentCategoryIds },
        });

        const reviews = await this._reviewRepository.findAll({
            providerId: provider._id.toString(),
        });

        return toProviderDashboardDTO(provider, bookings, services, subCategories, parentCategories, reviews);
    }

    public async getAvailabilityByLocation(
        userId: string,
        serviceSubCategoryId: string,
        userLat: number,
        userLng: number,
        radiusKm: number,
        timeMin: string,
        timeMax: string
    ): Promise<Array<{ providerId: string; providerName: string; availableSlots: calendar_v3.Schema$TimePeriod[] }>> {

        const services = await this._serviceRepository.findAll({ subCategoryId: serviceSubCategoryId });
        const providerIdSet = new Set<string>(services.map(s => s.providerId?.toString()).filter(Boolean) as string[]);
        if (providerIdSet.size === 0) return [];

        const providers = await this._providerRepository.findAll({
            _id: { $in: Array.from(providerIdSet) }, userId: { $ne: userId }
        });

        const providersInRange = providers.filter(p => {
            const coords = p.serviceLocation?.coordinates;
            if (!coords || coords.length !== 2) return false;
            const [provLng, provLat] = coords;
            return _haversineKm(userLat, userLng, provLat, provLng) <= radiusKm;
        });

        const startISO = new Date(timeMin);
        const endISO = new Date(timeMax);
        const results: Array<{ providerId: string; providerName: string; availableSlots: calendar_v3.Schema$TimePeriod[] }> = [];

        for (const provider of providersInRange) {
            const providerId = provider._id.toString();
            const providerName = provider.fullName;
            const availableSlots: calendar_v3.Schema$TimePeriod[] = [];

            const existingBookings = await this._bookingRepository.findByProviderByTime(
                providerId,
                timeMin.split('T')[0],
                timeMax.split('T')[0]
            );

            for (let d = new Date(startISO); d <= endISO; d.setDate(d.getDate() + 1)) {

                const dateStr = format(d, 'yyyy-MM-dd');
                const dayName = format(d, 'EEEE');


                if (this._isProviderOnLeave(provider, dateStr)) {
                    continue;
                }

                const override = this._getDateOverride(provider, dateStr);
                if (override?.isUnavailable) {
                    continue;
                }

                const weeklySlots = this._getWeeklySlots(provider, dayName);
                if (weeklySlots.length === 0) {
                    continue;
                }

                const busySlots = override ? override.busySlots : [];

                const slotMinutes = 60;
                const slotMs = slotMinutes * 60 * 1000;

                for (const timeSlot of weeklySlots) {
                    const [sh, sm] = String(timeSlot.start).split(':').map(Number);
                    const [eh, em] = String(timeSlot.end).split(':').map(Number);

                    const dayStart = new Date(d); dayStart.setHours(sh || 0, sm || 0, 0, 0);
                    const dayEnd = new Date(d); dayEnd.setHours(eh || 0, em || 0, 0, 0);

                    for (let slotStart = new Date(dayStart); slotStart.getTime() + slotMs <= dayEnd.getTime(); slotStart = new Date(slotStart.getTime() + slotMs)) {
                        const slotEnd = new Date(slotStart.getTime() + slotMs);

                        const isAvailable = this._isSlotAvailable(slotStart, slotEnd, existingBookings, busySlots);

                        if (isAvailable) {
                            availableSlots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
                        }
                    }
                }
            }
            results.push({ providerId, providerName, availableSlots });
        }

        return results;
    }


    public async getEarningsAnalytics(userId: string, period: 'week' | 'month'): Promise<EarningsAnalyticsData> {
        const provider = await this._providerRepository.findOne({ userId });
        if (!provider) {
            throw new CustomError("Provider profile not found", HttpStatusCode.NOT_FOUND);
        }
        const providerId = provider._id.toString();

        const now = new Date();
        let currentStartDate: Date, currentEndDate: Date, prevStartDate: Date, prevEndDate: Date;

        if (period === 'week') {
            currentStartDate = startOfWeek(now, { weekStartsOn: 1 });
            currentEndDate = endOfWeek(now, { weekStartsOn: 1 });
            prevStartDate = startOfWeek(sub(now, { weeks: 1 }), { weekStartsOn: 1 });
            prevEndDate = endOfWeek(sub(now, { weeks: 1 }), { weekStartsOn: 1 });
        } else {
            currentStartDate = startOfMonth(now);
            currentEndDate = endOfMonth(now);
            prevStartDate = startOfMonth(sub(now, { months: 1 }));
            prevEndDate = endOfMonth(sub(now, { months: 1 }));
        }

        const [currentBookings, prevBookings] = await Promise.all([
            this._bookingRepository.findByProviderAndDateRangeForEarnings(providerId, currentStartDate, currentEndDate),
            this._bookingRepository.findByProviderAndDateRangeForEarnings(providerId, prevStartDate, prevEndDate)
        ]);

        const totalEarnings = currentBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
        const prevTotalEarnings = prevBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
        const earningsChangePercentage = prevTotalEarnings > 0
            ? ((totalEarnings - prevTotalEarnings) / prevTotalEarnings) * 100
            : totalEarnings > 0 ? 100 : 0;

        const currentClients = [...new Set(currentBookings.map(b => (b.userId as { _id: mongoose.Types.ObjectId })._id.toString()))];
        const totalClients = currentClients.length;

        let newClients = 0;
        for (const userId of currentClients) {
            const hadPriorBooking = await this._bookingRepository.hasPriorBooking(userId, providerId, currentStartDate);
            if (!hadPriorBooking) newClients++;
        }

        const serviceEarnings: { [key: string]: number } = {};
        currentBookings.forEach(b => {
            const serviceName = (b.serviceId as any)?.title || 'Unknown Service';
            serviceEarnings[serviceName] = (serviceEarnings[serviceName] || 0) + (Number(b.amount) || 0);
        });
        const topServiceEntry = Object.entries(serviceEarnings).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];
        const topService = { name: topServiceEntry[0], earnings: topServiceEntry[1] };

        return toEarningsAnalyticsDTO(
            totalEarnings,
            earningsChangePercentage,
            totalClients,
            newClients,
            topService,
            currentBookings
        );
    }



    public async getProviderPerformance(userId: string): Promise<IProviderPerformance> {
        const providerId = await this._providerRepository.getProviderId(userId);
        const provider = await this._providerRepository.findById(providerId);
        if (!provider) {
            throw new CustomError("Provider not found", HttpStatusCode.NOT_FOUND);
        }

        const [bookings, reviewsFromDb, activeServicesCount, serviceBreakdown] = await Promise.all([
            this._bookingRepository.findAll({ providerId }),
            this._reviewRepository.findAll({ providerId }),
            this._serviceRepository.findServiceCount(providerId),
            this._bookingRepository.getBookingStatsByService(providerId)
        ]);

        const userIds = reviewsFromDb.map(r => r.userId?.toString()).filter(id => id);
        const users = await this._userRepository.findAll({ _id: { $in: userIds } });

        return toProviderPerformanceDTO(
            provider,
            bookings,
            reviewsFromDb,
            users,
            activeServicesCount,
            serviceBreakdown
        );
    }

    public async getAvailability(userId: string): Promise<IProvider['availability']> {
        const provider = await this._providerRepository.findOne({ userId: userId });
        if (!provider) {
            throw new CustomError("Provider not found", HttpStatusCode.NOT_FOUND);
        }
        return provider.availability;
    }

    public async updateAvailability(
        userId: string,
        data: IAvailabilityUpdateData
    ): Promise<IProvider['availability']> {
        const provider = await this._providerRepository.findOne({ userId: userId });
        if (!provider) {
            throw new CustomError("Provider not found", HttpStatusCode.NOT_FOUND);
        }

        const updatedProvider = await this._providerRepository.update(provider._id.toString(), {
            availability: data
        });

        if (!updatedProvider) {
            throw new CustomError("Failed to update availability", HttpStatusCode.INTERNAL_SERVER_ERROR);
        }

        return updatedProvider.availability;
    }







    private async _getProvidersByInitialCriteria(
        subCategoryId: string,
        userIdToExclude: string,
        filters: {
            radius: number;
            lat: number;
            long: number;
            experience?: number;
            date?: string;
            time?: string;
            price?: number;
        }
    ): Promise<IProvider[]> {

        const services = await this._serviceRepository.findServicesByCriteria({
            subCategoryId,
            minExperience: filters.experience,
            maxPrice: filters.price,
        });

        if (!services.length) return [];

        const providerIdsFromServices = [...new Set(services.map(s => s.providerId.toString()))];

        const time24h = filters.time ? convertTo24Hour(filters.time) : undefined;
        const filteredProviders = await this._providerRepository.findFilteredProviders({
            providerIds: providerIdsFromServices,
            userIdToExclude,
            lat: filters.lat,
            long: filters.long,
            radius: filters.radius,
            date: filters.date,
            time: time24h,
        });

        return filteredProviders;
    }


    private async _filterProvidersByBookingConflicts(
        potentialProviders: IProvider[],
        filters: { date?: string; time?: string }
    ): Promise<IProvider[]> {
        if (!filters.date || !filters.time) {
            return potentialProviders;
        }

        const potentialProviderIds = potentialProviders.map(p => p._id.toString());
        const allBookingsForDay = await this._bookingRepository.findByProviderAndDateRange(
            potentialProviderIds,
            filters.date,
            filters.date
        );

        if (!allBookingsForDay.length) return potentialProviders;

        const busyProviderIds = new Set<string>();
        const time24h = convertTo24Hour(filters.time);
        const [searchHours, searchMinutes] = time24h.split(':').map(Number);
        const searchSlotStart = new Date(filters.date);
        searchSlotStart.setHours(searchHours, searchMinutes, 0, 0);
        const searchSlotEnd = new Date(searchSlotStart.getTime() + 60 * 60 * 1000);

        allBookingsForDay.forEach(booking => {
            const bookingTime24h = convertTo24Hour(booking.scheduledTime as string);
            const [bookHours, bookMinutes] = bookingTime24h.split(':').map(Number);
            const bookingStart = new Date(booking.scheduledDate as string);
            bookingStart.setHours(bookHours, bookMinutes, 0, 0);
            const bookingEnd = new Date(bookingStart.getTime() + ((booking.duration as number) || 60) * 60 * 1000);

            if (searchSlotStart < bookingEnd && searchSlotEnd > bookingStart) {
                busyProviderIds.add(booking.providerId.toString());
            }
        });

        if (busyProviderIds.size === 0) return potentialProviders;

        return potentialProviders.filter(
            provider => !busyProviderIds.has(provider._id.toString())
        );
    }

    private async _enrichProvidersWithDetails(
        availableProviders: IProvider[],
        subCategoryId: string,
        filters: { lat: number; long: number }
    ): Promise<IBackendProvider[]> {
        const finalProviderIds = availableProviders.map(p => p._id.toString());

        const [reviews, services] = await Promise.all([
            this._reviewRepository.findReviewsByProviderIds(finalProviderIds),
            this._serviceRepository.findAll({ providerId: { $in: finalProviderIds } })
        ]);

        const userIdsForReviews = [...new Set(reviews.map(r => r.userId.toString()))];
        const users = userIdsForReviews.length > 0 ? await this._userRepository.findUsersByIds(userIdsForReviews) : [];
        const userMap = new Map(users.map(u => [u._id.toString(), { name: u.name, profilePicture: u.profilePicture || "" }]));

        const reviewsByProvider = new Map<string, IReviewsOfUser[]>();
        reviews.forEach(review => {
            const pid = review.providerId.toString();
            if (!reviewsByProvider.has(pid)) reviewsByProvider.set(pid, []);
            const userData = userMap.get(review.userId.toString());
            reviewsByProvider.get(pid)!.push({
                userName: (userData?.name as string) || "Anonymous",
                userImg: (userData?.profilePicture as string) || "",
                rating: review.rating as number,
                review: (review.reviewText as string) || "",
            });
        });

        return availableProviders.map(provider =>
            toBackendProviderDTO(
                provider,
                services,
                reviewsByProvider.get(provider._id.toString()) || [],
                subCategoryId,
                filters.lat,
                filters.long
            )
        );
    }

    private _isProviderOnLeave(provider: IProvider, dateStr: string): boolean {
        const date = new Date(dateStr.replace(/-/g, '/')); // Use replace for cross-browser safety
        return provider.availability.leavePeriods.some(period => {
            const from = new Date(period.from.replace(/-/g, '/'));
            const to = new Date(period.to.replace(/-/g, '/'));
            return date >= from && date <= to;
        });
    }

    private _getDateOverride(provider: IProvider, dateStr: string) {
        return provider.availability.dateOverrides.find(o => o.date === dateStr);
    }

    private _getWeeklySlots(provider: IProvider, dayName: string): TimeSlot[] {
        const daySchedule = provider.availability.weeklySchedule.find(d => d.day === dayName);
        return (daySchedule && daySchedule.active) ? daySchedule.slots : [];
    }

    private _isSlotAvailable(
        slotStart: Date,
        slotEnd: Date,
        existingBookings: IBooking[],
        busySlots: TimeSlot[]
    ): boolean {
        const bookingConflict = existingBookings.some(booking => {
            const bookingTime24h = convertTo24Hour(booking.scheduledTime as string);
            const [hours, minutes] = bookingTime24h.split(':').map(Number);

            const bookingStart = new Date(booking.scheduledDate as string);
            bookingStart.setHours(hours, minutes, 0, 0);

            const durationMs = ((booking.duration as number) || 60) * 60 * 1000;
            const bookingEnd = new Date(bookingStart.getTime() + durationMs);

            return slotStart < bookingEnd && slotEnd > bookingStart;
        });

        if (bookingConflict) return false;

        const busySlotConflict = busySlots.some(busySlot => {
            const [sh, sm] = busySlot.start.split(':').map(Number);
            const [eh, em] = busySlot.end.split(':').map(Number);

            const busyStart = new Date(slotStart); busyStart.setHours(sh, sm, 0, 0);
            const busyEnd = new Date(slotStart); busyEnd.setHours(eh, em, 0, 0);

            return slotStart < busyEnd && slotEnd > busyStart;
        });

        if (busySlotConflict) return false;

        return true;
    }


}
