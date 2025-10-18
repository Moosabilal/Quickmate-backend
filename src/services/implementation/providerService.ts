import { inject, injectable } from "inversify";
import { IProviderRepository } from "../../repositories/interface/IProviderRepository";
import { IProviderService } from "../interface/IProviderService";
import TYPES from "../../di/type";
import mongoose from "mongoose";
import { IProvider, Provider } from "../../models/Providers";
import { EarningsAnalyticsData, IBackendProvider, IDashboardResponse, IDashboardStatus, IFeaturedProviders, IMonthlyTrend, IProviderForAdminResponce, IProviderForChatListPage, IProviderPerformance, IProviderProfile, IProviderRegistrationData, IRatingDistribution, IReview, IReviewsOfUser, IServiceAddPageResponse } from "../../interface/provider";
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
import { toClientForChatListPage, toProviderDashboardDTO, toProviderDTO, toProviderForChatListPage, toServiceAddPage } from "../../utils/mappers/provider.mapper";
import { toLoginResponseDTO } from "../../utils/mappers/user.mapper";
import { ProviderStatus } from "../../enums/provider.enum";
import { IServiceRepository } from "../../repositories/interface/IServiceRepository";
import { IService } from "../../models/Service";
import { IBookingRepository } from "../../repositories/interface/IBookingRepository";
import { IMessageRepository } from "../../repositories/interface/IMessageRepository";
import { IReviewRepository } from "../../repositories/interface/IReviewRepository";
import { BookingStatus } from "../../enums/booking.enum";
import { getAuthUrl, getOAuthClient } from "../../utils/googleCalendar";
import { calendar_v3, google } from 'googleapis';
import { isProviderInRange } from "../../utils/helperFunctions/locRangeCal";
import { convertTo24Hour } from "../../utils/helperFunctions/convertTo24hrs";
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek, sub } from "date-fns";


interface reviewsOfUser {
    username: string,
    rating: number
    review: string,
}

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;


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
        const updatedProvider = await this._providerRepository.update(provider.id, provider);
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
        if (provider.isVerified && provider.status !== ProviderStatus.REJECTED) {
            return { message: 'Account already verified.' };
        }
        if (typeof provider.registrationOtpAttempts === 'number' && provider.registrationOtpAttempts >= MAX_OTP_ATTEMPTS) {
            throw new CustomError(`Too many failed OTP attempts. Please request a new OTP.`, HttpStatusCode.FORBIDDEN);
        }
        if (!provider.registrationOtp || provider.registrationOtp !== otp) {
            provider.registrationOtpAttempts = (typeof provider.registrationOtpAttempts === 'number' ? provider.registrationOtpAttempts : 0) + 1;
            await this._providerRepository.update(provider.id, provider);
            throw new CustomError('Invalid OTP. Please try again.', HttpStatusCode.BAD_REQUEST);
        }

        if (!provider.registrationOtpExpires || new Date() > provider.registrationOtpExpires) {
            provider.registrationOtp = undefined;
            provider.registrationOtpExpires = undefined;
            provider.registrationOtpAttempts = 0;
            await this._providerRepository.update(provider.id, provider);
            throw new CustomError('OTP has expired. Please request a new one.', HttpStatusCode.BAD_REQUEST);
        }

        provider.isVerified = true;
        provider.registrationOtp = undefined;
        provider.registrationOtpExpires = undefined;
        provider.registrationOtpAttempts = 0;
        provider.status = ProviderStatus.PENDING
        const updatedProvider = await this._providerRepository.update(provider.id, provider);

        const userId = provider.userId.toString()
        const user = await this._userRepository.findById(userId)
        if (!user) {
            throw new CustomError("Something went wrong, Please contact admin", HttpStatusCode.FORBIDDEN)
        }
        user.role = Roles.PROVIDER
        const updatedUser = await this._userRepository.update(userId, user)

        return {
            provider: toProviderDTO(updatedProvider),
            user: toLoginResponseDTO(updatedUser)
        };
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

    public async updateProviderDetails(updateData: IProviderRegistrationData): Promise<IProviderProfile> {
        const updatedProvider = await this._providerRepository.updateProvider(updateData)

        return {
            id: updatedProvider._id.toString(),
            userId: updatedProvider.userId.toString(),
            fullName: updatedProvider.fullName,
            phoneNumber: updatedProvider.phoneNumber,
            email: updatedProvider.email,
            serviceLocation: `${updatedProvider.serviceLocation.coordinates[1]},${updatedProvider.serviceLocation.coordinates[0]}`,
            serviceArea: updatedProvider.serviceArea,
            profilePhoto: updatedProvider.profilePhoto,
            status: updatedProvider.status,
            availability: updatedProvider.availability,
            earnings: updatedProvider.earnings,
            totalBookings: updatedProvider.totalBookings,
            payoutPending: updatedProvider.payoutPending,
            rating: updatedProvider.rating,
            isVerified: updatedProvider.isVerified,

        }

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
            if (status === 'Approved') {
                filter.status = "Approved";
            } else if (status === 'Rejected') {
                filter.status = "Rejected";
            } else if (status === "Suspended") {
                filter.status = "Suspended";
            } else if (status === "Pending") {
                filter.status = "Pending"
            }
        }

        const [providers, total] = await Promise.all([
            this._providerRepository.findProvidersWithFilter(filter, skip, limit),
            this._providerRepository.countProviders(filter),
        ]);

        if (!providers || providers.length === 0) {
            const error = new Error('No providers found.');
            (error as any).statusCode = 404;
            throw error;
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

        const data = providers.map(provider => {
            const providerIdStr = provider._id.toString();
            return {
                id: providerIdStr,
                userId: provider.userId.toString(),
                fullName: provider.fullName,
                phoneNumber: provider.phoneNumber,
                email: provider.email,
                serviceArea: provider.serviceArea,
                profilePhoto: provider.profilePhoto,
                status: provider.status,
                serviceOffered: serviceMap.get(providerIdStr) || [],
            };
        });


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
            throw new Error('Invalid token.');
        }

        const provider = await this._providerRepository.getProviderByUserId(decoded.id)
        return {
            id: provider._id.toString(),
            userId: provider.userId.toString(),
            fullName: provider.fullName,
            phoneNumber: provider.phoneNumber,
            email: provider.email,
            serviceLocation: `${provider.serviceLocation.coordinates[1]},${provider.serviceLocation.coordinates[0]}`,
            serviceArea: provider.serviceArea,
            profilePhoto: provider.profilePhoto,
            status: provider.status,
            subscription: provider.subscription
                ? {
                    planId: provider.subscription.planId
                        ? provider.subscription.planId.toString()
                        : undefined,
                    startDate: provider.subscription.startDate,
                    endDate: provider.subscription.endDate,
                    status: provider.subscription.status
                }
                : undefined,
            aadhaarIdProof: provider.aadhaarIdProof,
            availability: provider.availability,
            earnings: provider.earnings,
            totalBookings: provider.totalBookings,
            payoutPending: provider.payoutPending,
            rating: provider.rating,
            isVerified: provider.isVerified,

        }
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

        const services = await this._serviceRepository.findServicesByCriteria({
            subCategoryId,
            minExperience: filters.experience,
            maxPrice: filters.price,
        });

        if (!services || services.length === 0) {
            return [];
        }
        const providerIdsFromServices = [...new Set(services.map(s => s.providerId.toString()))];

        const time24h = filters.time ? convertTo24Hour(filters.time) : undefined;

        const potentialProviders = await this._providerRepository.findFilteredProviders({
            providerIds: providerIdsFromServices,
            userIdToExclude: userId,
            lat: filters.lat,
            long: filters.long,
            radius: filters.radius,
            date: filters.date,
            time: time24h,
        });

        if (!potentialProviders || potentialProviders.length === 0) {
            return [];
        }

        let availableProviders = [...potentialProviders];
        if (filters.date && time24h && potentialProviders.length > 0) {
            const potentialProviderIds = potentialProviders.map(p => p._id.toString());

            const allBookingsForDay = await this._bookingRepository.findByProviderAndDateRange(
                potentialProviderIds,
                filters.date,
                filters.date
            );

            if (allBookingsForDay.length > 0) {
                const busyProviderIds = new Set<string>();

                const [searchHours, searchMinutes] = time24h.split(':').map(Number);
                const searchSlotStart = new Date(filters.date);
                searchSlotStart.setHours(searchHours, searchMinutes, 0, 0);
                const searchSlotEnd = new Date(searchSlotStart.getTime() + 60 * 60 * 1000);

                allBookingsForDay.forEach(booking => {
                    const bookingTime24h = convertTo24Hour(booking.scheduledTime as string);
                    const [bookHours, bookMinutes] = bookingTime24h.split(':').map(Number);
                    const bookingStart = new Date(booking.scheduledDate as string);
                    bookingStart.setHours(bookHours, bookMinutes, 0, 0);

                    const bookingDurationMs = ((booking.duration as number) || 60) * 60 * 1000;
                    const bookingEnd = new Date(bookingStart.getTime() + bookingDurationMs);

                    if (searchSlotStart < bookingEnd && searchSlotEnd > bookingStart) {
                        busyProviderIds.add(booking.providerId.toString());
                    }
                });

                if (busyProviderIds.size > 0) {
                    availableProviders = potentialProviders.filter(
                        provider => !busyProviderIds.has(provider._id.toString())
                    );
                }
            }
        }

        if (availableProviders.length === 0) {
            return [];
        }

        const finalProviderIds = availableProviders.map(p => p._id.toString());
        const reviews = await this._reviewRepository.findReviewsByProviderIds(finalProviderIds);
        const userIdsForReviews = [...new Set(reviews.map(r => r.userId.toString()))];
        const users = await this._userRepository.findUsersByIds(userIdsForReviews);

        const userMap = new Map(users.map(u => [u._id.toString(), { name: u.name, profilePicture: u.profilePicture || "" }]));

        const servicesByProvider = new Map<string, IService[]>();
        services.forEach(service => {
            const pid = service.providerId.toString();
            if (!servicesByProvider.has(pid)) servicesByProvider.set(pid, []);
            servicesByProvider.get(pid)!.push(service);
        });

        const reviewsByProvider = new Map<string, IReviewsOfUser[]>();
        reviews.forEach(review => {
            const pid = review.providerId.toString();
            if (!reviewsByProvider.has(pid)) reviewsByProvider.set(pid, []);
            const userData = userMap.get(review.userId.toString());
            reviewsByProvider.get(pid)!.push({
                userName: (userData?.name as string) || "Anonymous",
                userImg: (userData?.profilePicture as string) || "",
                rating: review.rating as number,
                review: review.reviewText as string,
            });
        });

        const result: IBackendProvider[] = availableProviders.map(provider => {
            const providerIdStr = provider._id.toString();
            const providerServices = servicesByProvider.get(providerIdStr) || [];
            const primaryService = providerServices.find(s => s.subCategoryId.toString() === subCategoryId) || providerServices[0];
            const [provLng, provLat] = provider.serviceLocation.coordinates;
            const distanceKm = this._haversineKm(filters.lat, filters.long, provLat, provLng);

            return {
                _id: providerIdStr,
                fullName: provider.fullName,
                phoneNumber: provider.phoneNumber,
                email: provider.email,
                profilePhoto: provider.profilePhoto,
                serviceArea: provider.serviceArea,
                serviceLocation: `${provLat},${provLng}`,
                availability: provider.availability as any[],
                status: provider.status,
                earnings: provider.earnings,
                totalBookings: provider.totalBookings,
                experience: primaryService?.experience || 0,
                price: primaryService?.price || 0,
                distanceKm: parseFloat(distanceKm.toFixed(2)),
                reviews: reviewsByProvider.get(providerIdStr) || [],
            };
        });

        result.sort((a, b) => a.distanceKm - b.distanceKm);

        return result;
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
        const providerIdSet = new Set<string>(
            services.map(s => s.providerId?.toString()).filter(Boolean) as string[]
        );

        if (providerIdSet.size === 0) {
            return [];
        }

        const providers = await this._providerRepository.findAll({
            _id: { $in: Array.from(providerIdSet) }, userId: { $ne: userId } 
        });

        const providersInRange = providers.filter(p => {
            const coords = (p as any).serviceLocation?.coordinates as number[] | undefined;
            if (!coords || coords.length !== 2) return false;

            const [provLng, provLat] = coords;
            const distKm = this._haversineKm(userLat, userLng, provLat, provLng);
            return distKm <= radiusKm;
        });

        const startISO = new Date(timeMin);
        const endISO = new Date(timeMax);
        const results: Array<{ providerId: string; providerName: string; availableSlots: calendar_v3.Schema$TimePeriod[] }> = [];

        for (const provider of providersInRange) {
            const providerId = (provider._id as any).toString();
            const providerName = (provider as any).fullName || 'Provider';

            const existingBookings = await this._bookingRepository.findByProviderByTime(
                providerId,
                timeMin.split('T')[0],
                timeMax.split('T')[0]
            );

            const slotMinutes = 60;
            const slotMs = slotMinutes * 60 * 1000;
            const availableSlots: calendar_v3.Schema$TimePeriod[] = [];

            const dayMap: { [key: string]: number } = {
                'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
                'Thursday': 4, 'Friday': 5, 'Saturday': 6
            };

            for (let d = new Date(startISO); d <= endISO; d.setDate(d.getDate() + 1)) {
                const dayName = Object.keys(dayMap).find(k => dayMap[k] === d.getDay());
                if (!dayName) continue;

                const dayAvail = (provider as any).availability?.find((av: any) => av.day === dayName);
                if (!dayAvail) continue;

                const [sh, sm] = String(dayAvail.startTime).split(':').map(Number);
                const [eh, em] = String(dayAvail.endTime).split(':').map(Number);

                const dayStart = new Date(d);
                dayStart.setHours(sh || 0, sm || 0, 0, 0);
                const dayEnd = new Date(d);
                dayEnd.setHours(eh || 0, em || 0, 0, 0);

                for (let slotStart = new Date(dayStart);
                    slotStart.getTime() + slotMs <= dayEnd.getTime();
                    slotStart = new Date(slotStart.getTime() + slotMs)) {

                    const slotEnd = new Date(slotStart.getTime() + slotMs);

                    const overlaps = existingBookings.some((booking: any) => {
                        if (!booking.scheduledDate || !booking.scheduledTime) {
                            return false;
                        }

                        const time24h = convertTo24Hour(booking.scheduledTime);
                        const [hours, minutes] = time24h.split(':').map(Number);

                        if (isNaN(hours) || isNaN(minutes)) {
                            return false;
                        }

                        const bookingStart = new Date(booking.scheduledDate);
                        bookingStart.setHours(hours, minutes, 0, 0);

                        const bookingDurationMinutes = booking.duration > 0 ? booking.duration : slotMinutes;

                        const bookingDurationMs = bookingDurationMinutes * 60 * 1000;

                        const bookingEnd = new Date(bookingStart.getTime() + bookingDurationMs);
                        return slotStart < bookingEnd && slotEnd > bookingStart;
                    });

                    if (!overlaps) {
                        availableSlots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
                    }
                }
            }

            results.push({ providerId, providerName, availableSlots });
        }

        return results;
    }


    private _haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // km
        const dLat = this._deg2rad(lat2 - lat1);
        const dLon = this._deg2rad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this._deg2rad(lat1)) * Math.cos(this._deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private _deg2rad(deg: number): number {
        return deg * (Math.PI / 180);
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

        const currentBookings = await this._bookingRepository.findByProviderAndDateRangeForEarnings(providerId, currentStartDate, currentEndDate);
        const prevBookings = await this._bookingRepository.findByProviderAndDateRangeForEarnings(providerId, prevStartDate, prevEndDate);

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
            if (!hadPriorBooking) {
                newClients++;
            }
        }

        const serviceEarnings: { [key: string]: number } = {};
        currentBookings.forEach(b => {
            const serviceName = (b.serviceId as any)?.title || 'Unknown Service';
            serviceEarnings[serviceName] = (serviceEarnings[serviceName] || 0) + (Number(b.amount) || 0);
        });

        const topService = Object.entries(serviceEarnings).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];

        const breakdown = currentBookings.map(b => ({
            date: new Date(b.bookingDate as string | number | Date),
            service: (b.serviceId as any)?.title || 'Unknown Service',
            client: (b.userId as any)?.name || 'Unknown Client',
            amount: Number(b.amount) || 0,
            status: String(b.status || 'Unknown'),
        }));
        return {
            totalEarnings,
            earningsChangePercentage,
            totalClients,
            newClients,
            topService: { name: topService[0], earnings: topService[1] },
            breakdown,
        };
    }



    public async getProviderPerformance(userId: string): Promise<IProviderPerformance> {
        const providerId = await this._providerRepository.getProviderId(userId);
        const provider = await this._providerRepository.findById(providerId);
        if (!provider) {
            throw new CustomError("Provider not found", HttpStatusCode.NOT_FOUND);
        }

        // Fetch all necessary data in parallel, now including the service breakdown
        const [bookings, reviewsFromDb, activeServicesCount, serviceBreakdown] = await Promise.all([
            this._bookingRepository.findAll({ providerId }),
            this._reviewRepository.findAll({ providerId }),
            this._serviceRepository.findServiceCount(providerId),
            this._bookingRepository.getBookingStatsByService(providerId) // Using the new efficient method
        ]);

        // --- Basic Calculations ---
        const totalBookings = bookings.length;
        const completedBookings = bookings.filter(b => b.status === BookingStatus.COMPLETED).length;
        const cancelledBookings = bookings.filter(b => b.status === BookingStatus.CANCELLED).length;

        const totalEarnings = bookings
            .filter(b => b.status === BookingStatus.COMPLETED)
            .reduce((sum, b) => sum + (Number(b.amount) ?? 0), 0);

        const avgRating = reviewsFromDb.length
            ? reviewsFromDb.reduce((sum, r) => sum + (Number(r.rating) ?? 0), 0) / reviewsFromDb.length
            : 0;

        // --- Format Reviews with User Info ---
        const userIds = reviewsFromDb.map(r => r.userId?.toString()).filter(id => id);
        const users = await this._userRepository.findAll({ _id: { $in: userIds } });
        const reviews: IReview[] = reviewsFromDb.map(r => {
            const user = users.find(u => u._id.toString() === r.userId?.toString());

            return {
                name: (user?.name as string) ?? "Anonymous",
                time: r.createdAt
                    ? new Date(r.createdAt as string | number | Date).toLocaleDateString()
                    : "N/A",
                rating: Number(r.rating) ?? 0,
                comment: (r.comment as string ?? r.reviewText as string ?? "") as string,
                avatar: (user?.profilePicture as string) ?? "default_avatar.png"
            };
        });

        // --- Rating Distribution Calculation ---
        const ratingCounts = new Map<number, number>([[5, 0], [4, 0], [3, 0], [2, 0], [1, 0]]);
        for (const review of reviewsFromDb) {
            const rating = Math.round(Number(review.rating));
            if (ratingCounts.has(rating)) {
                ratingCounts.set(rating, ratingCounts.get(rating)! + 1);
            }
        }
        const totalReviews = reviewsFromDb.length;
        const ratingDistribution: IRatingDistribution[] = Array.from(ratingCounts.entries()).map(([stars, count]) => ({
            stars,
            count,
            percentage: totalReviews > 0 ? parseFloat(((count / totalReviews) * 100).toFixed(1)) : 0
        })).sort((a, b) => b.stars - a.stars);

        // --- Star Rating Trend (Last 6 Months) ---
        const monthlyRatingData: { [key: string]: { sum: number, count: number } } = {};
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        for (const review of reviewsFromDb) {
            const reviewDate = new Date(review.createdAt as string | Date);
            if (reviewDate >= sixMonthsAgo) {
                const monthKey = `${reviewDate.getFullYear()}-${reviewDate.getMonth()}`;
                if (!monthlyRatingData[monthKey]) {
                    monthlyRatingData[monthKey] = { sum: 0, count: 0 };
                }
                monthlyRatingData[monthKey].sum += Number(review.rating);
                monthlyRatingData[monthKey].count++;
            }
        }
        const starRatingTrend: IMonthlyTrend[] = [];
        const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            const monthName = monthFormatter.format(date);

            const data = monthlyRatingData[monthKey];
            starRatingTrend.push({
                month: monthName,
                value: data && data.count > 0 ? parseFloat((data.sum / data.count).toFixed(1)) : 0
            });
        }

        // --- Final Assembly ---
        const completionRate = totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(1) : "0";
        const cancellationRate = totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) : "0";

        const result: IProviderPerformance = {
            providerId: provider._id.toString(),
            providerName: provider.fullName,
            totalBookings,
            completedBookings,
            cancelledBookings,
            totalEarnings,
            avgRating: parseFloat(avgRating.toFixed(1)),
            activeServices: activeServicesCount ?? 0,
            completionRate: `${completionRate}%`,
            cancellationRate: `${cancellationRate}%`,
            reviews,
            ratingDistribution,
            starRatingTrend,
            serviceBreakdown
        };

        return result;
    }


}
