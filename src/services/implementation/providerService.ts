import { inject, injectable } from "inversify";
import { IProviderRepository } from "../../repositories/interface/IProviderRepository";
import { IProviderService } from "../interface/IProviderService";
import TYPES from "../../di/type";
import mongoose from "mongoose";
import { IProvider, Provider } from "../../models/Providers";
import { IBackendProvider, IDashboardResponse, IDashboardStatus, IFeaturedProviders, IProviderForAdminResponce, IProviderForChatListPage, IProviderProfile, IReviewsOfUser, IServiceAddPageResponse } from "../../interface/provider.dto";
import { ICategoryRepository } from "../../repositories/interface/ICategoryRepository";
import jwt, { JwtPayload } from 'jsonwebtoken'
import { HttpStatusCode } from "../../enums/HttpStatusCode";
import { ErrorMessage } from "../../enums/ErrorMessage";
import { CustomError } from "../../utils/CustomError";
import { generateOTP } from "../../utils/otpGenerator";
import { sendVerificationEmail } from "../../utils/emailService";
import { ILoginResponseDTO, ResendOtpRequestBody, VerifyOtpRequestBody } from "../../interface/auth.dto";
import { IUserRepository } from "../../repositories/interface/IUserRepository";
import { Roles } from "../../enums/userRoles";
import { toProviderDashboardDTO, toProviderDTO, toProviderForChatListPage, toServiceAddPage } from "../../utils/mappers/provider.mapper";
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

    public async registerProvider(data: IProvider): Promise<{ message: string, email: string }> {

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

    public async updateProviderDetails(updateData: Partial<IProvider>): Promise<IProviderProfile> {
        const updatedProvider = await this._providerRepository.updateProvider(updateData)

        // Check if availability was updated and update Google Calendar events
        // if (updateData.availability && updatedProvider.userId) {
        //     try {
        //         await this.updateGoogleCalendarEvents(updatedProvider, updatedProvider.userId.toString());
        //         console.log(`Google Calendar events updated for provider ${updatedProvider._id}`);
        //     } catch (error) {
        //         console.error(`Failed to update Google Calendar events for provider ${updatedProvider._id}:`, error);
        //         // Don't throw error here as the provider update was successful
        //     }
        // }

        return {
            id: updatedProvider._id.toString(),
            userId: updatedProvider.userId.toString(),
            fullName: updatedProvider.fullName,
            phoneNumber: updatedProvider.phoneNumber,
            email: updatedProvider.email,
            serviceId: updatedProvider.serviceId.map(id => id.toString()),
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
            if (status === 'Active') {
                filter.status = "Active";
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
            serviceId: provider.serviceId.map(id => id.toString()),
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

        console.log('🟦 [getProviderwithFilters] Starting provider filter process...');
        console.log('📍 Received filters:', JSON.stringify(filters, null, 2));
        console.log('👤 User ID:', userId);
        console.log('📦 SubCategory ID:', subCategoryId);

        // --- Step 1: Find services matching the criteria ---
        console.log('🔍 Step 1: Fetching services matching criteria...');
        const services = await this._serviceRepository.findServicesByCriteria({
            subCategoryId,
            minExperience: filters.experience,
            maxPrice: filters.price,
        });
        console.log(`✅ Services fetched: ${services?.length || 0}`);

        if (!services || services.length === 0) {
            console.warn('⚠️ No services found matching filters.');
            return [];
        }

        // --- Step 2: Find available providers for these services ---
        const providerIdsFromServices = [...new Set(services.map(s => s.providerId.toString()))];
        console.log(`🧩 Providers extracted from services: ${providerIdsFromServices.length}`);

        console.log('🔍 Step 2: Fetching filtered providers...');
        const providers = await this._providerRepository.findFilteredProviders({
            providerIds: providerIdsFromServices,
            userIdToExclude: userId,
            lat: filters.lat,
            long: filters.long,
            radius: filters.radius,
            date: filters.date,
            time: filters.time,
        });
        console.log(`✅ Providers fetched: ${providers?.length || 0}`);

        if (!providers || providers.length === 0) {
            console.warn('⚠️ No providers found after applying filters.');
            return [];
        }

        // --- Step 3: Fetch associated data (reviews and user details) ---
        console.log('🔍 Step 3: Fetching reviews and user details...');
        const finalProviderIds = providers.map(p => p._id.toString());
        const reviews = await this._reviewRepository.findReviewsByProviderIds(finalProviderIds);
        console.log(`📝 Reviews fetched: ${reviews?.length || 0}`);

        const userIdsForReviews = [...new Set(reviews.map(r => r.userId.toString()))];
        console.log(`👥 Unique users in reviews: ${userIdsForReviews.length}`);

        const users = await this._userRepository.findUsersByIds(userIdsForReviews);
        console.log(`✅ Users fetched: ${users?.length || 0}`);

        // --- Step 4: Map all data together in memory (Business Logic) ---
        console.log('🧠 Step 4: Mapping data (users, services, reviews)...');
        const userMap = new Map(users.map(u => [u._id.toString(), { name: u.name, profilePicture: u.profilePicture || "" }]));

        const servicesByProvider = new Map<string, IService[]>();
        services.forEach(service => {
            const pid = service.providerId.toString();
            if (!servicesByProvider.has(pid)) servicesByProvider.set(pid, []);
            servicesByProvider.get(pid)!.push(service);
        });
        console.log(`🗂 Services grouped by provider: ${servicesByProvider.size}`);

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
        console.log(`💬 Reviews grouped by provider: ${reviewsByProvider.size}`);

        // --- Step 5: Construct the final response object ---
        console.log('🏗 Step 5: Constructing final response object...');
        const result: IBackendProvider[] = providers.map(provider => {
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

        console.log(`📊 Total providers after aggregation: ${result.length}`);
        console.log('📏 Sorting providers by distance (ascending)...');
        result.sort((a, b) => a.distanceKm - b.distanceKm);

        console.log('✅ [getProviderwithFilters] Completed successfully.');
        return result;
    }




    public async providerForChatPage(userId: string): Promise<IProviderForChatListPage[]> {
        if (!userId) {
            throw new CustomError("Sorry UserId not found", HttpStatusCode.NOT_FOUND);
        }

        const bookings = await this._bookingRepository.findAll({ userId });
        if (!bookings.length) return [];

        const providerIds = [...new Set(bookings.map(b => b.providerId?.toString()).filter(Boolean))];
        const providers = await this._providerRepository.findAll({ _id: { $in: providerIds } });

        const serviceIds = bookings.map(b => b.serviceId?.toString()).filter(Boolean);
        if (!serviceIds.length) return [];
        const services = await this._serviceRepository.findAll({ _id: { $in: serviceIds } });

        const bookingIds = bookings.map(b => b._id.toString());
        const messages = await this._messageRepository.findLastMessagesByBookingIds(bookingIds)

        return toProviderForChatListPage(bookings, providers, services, messages);
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

    // public async initiateGoogleAuth(userId: string): Promise<{ url: string }> {
    //     const oAuth2Client = getOAuthClient();

    //     const url = getAuthUrl(userId);

    //     return { url };
    // }


    // private async updateGoogleCalendarEvents(provider: any, userId: string): Promise<void> {
    //     const user = await this._userRepository.findById(userId);

    //     if (!user?.googleCalendar?.tokens) {
    //         console.log(`No Google Calendar tokens found for user ${userId}`);
    //         return;
    //     }   

    //     const oAuth2Client = getOAuthClient();

    //     oAuth2Client.setCredentials(user.googleCalendar.tokens);
    //     const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

    //     const eventSummary = "My Working Hours";

    //     try {
    //         // Clear old availability events
    //         const { data } = await calendar.events.list({
    //             calendarId: "primary",
    //             q: eventSummary,
    //             showDeleted: false,
    //         });

    //         if (data.items) {
    //             for (const event of data.items) {
    //                 if (event.id) {
    //                     await calendar.events.delete({
    //                         calendarId: "primary",
    //                         eventId: event.id,
    //                     });
    //                 }
    //             }
    //         }
    //     } catch (error) {
    //         console.error("Could not clear old availability events, proceeding to create new ones.", error);
    //     }

    //     // Create new events based on updated availability
    //     const weekDays: { [key: string]: number } = {
    //         'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    //         'Thursday': 4, 'Friday': 5, 'Saturday': 6
    //     };

    //     for (const slot of provider.availability) {
    //         const dayName = slot.day;
    //         const dayNumber = weekDays[dayName];

    //         if (dayNumber === undefined) continue;

    //         const now = new Date();
    //         const nextDayDate = new Date(now);
    //         nextDayDate.setDate(now.getDate() + (dayNumber - now.getDay() + 7) % 7);

    //         const [startHour, startMinute] = slot.startTime.split(':').map(Number);
    //         const [endHour, endMinute] = slot.endTime.split(':').map(Number);

    //         const startDate = new Date(nextDayDate.setHours(startHour, startMinute, 0, 0));
    //         const endDate = new Date(nextDayDate.setHours(endHour, endMinute, 0, 0));

    //         const event = {
    //             summary: eventSummary,
    //             description: "Time slot marked as available for bookings.",
    //             start: {
    //                 dateTime: startDate.toISOString(),
    //                 timeZone: "Asia/Kolkata",
    //             },
    //             end: {
    //                 dateTime: endDate.toISOString(),
    //                 timeZone: "Asia/Kolkata",
    //             },
    //             recurrence: [
    //                 `RRULE:FREQ=WEEKLY;BYDAY=${dayName.substring(0, 2).toUpperCase()}`
    //             ],
    //         };

    //         try {
    //             await calendar.events.insert({
    //                 calendarId: "primary",
    //                 requestBody: event,
    //             });
    //             console.log(`Created Google Calendar event for ${dayName}`);
    //         } catch (error) {
    //             console.error(`Failed to create event for ${dayName}:`, error);
    //         }
    //     }
    // }

    // public async googleCallback(code: string, userId: string): Promise<{ message: string }> {
    //     const oAuth2Client = getOAuthClient();

    //     const { tokens } = await oAuth2Client.getToken(code);
    //     oAuth2Client.setCredentials(tokens);

    //     await this._userRepository.update(userId, {
    //         "googleCalendar.tokens": tokens
    //     });

    //     const provider = await this._providerRepository.findOne({ userId: userId })

    //     if (!provider) {
    //         throw new CustomError("Provider not found.", HttpStatusCode.BAD_REQUEST);
    //     }

    //     // Update Google Calendar events
    //     await this.updateGoogleCalendarEvents(provider, userId);

    //     return { message: "Google Calendar connected!" }
    // }

    // public async createCalendarEvent(
    //     providerId: string,
    //     serviceId: string,
    //     booking: {
    //         summary: string;
    //         description: string;
    //         start: Date | string;
    //     }
    // ): Promise<void> {

    //     const provider = await this._providerRepository.findById(providerId);
    //     const user = await this._userRepository.findById(provider._id.toString())
    //     if (!user?.googleCalendar?.tokens) return;

    //     const oAuth2Client = new google.auth.OAuth2(
    //         process.env.GOOGLE_CLIENT_ID,
    //         process.env.GOOGLE_CLIENT_SECRET,
    //         process.env.GOOGLE_REDIRECT_URI
    //     );
    //     oAuth2Client.setCredentials(user.googleCalendar.tokens);

    //     const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

    //     const service = await this._serviceRepository.findOne({ subCategoryId: serviceId, providerId });
    //     if (!service) throw new Error("Service not found");

    //     const start = new Date(booking.start);
    //     if (isNaN(start.getTime())) {
    //         throw new Error("Invalid booking start date");
    //     }

    //     let end = new Date(start);
    //     if (service.duration) {
    //         const [hours, minutes] = service.duration.split(":").map(Number);
    //         end.setHours(end.getHours() + (hours || 0));
    //         end.setMinutes(end.getMinutes() + (minutes || 0));
    //     } else {
    //         end = new Date(start.getTime() + 60 * 60000);
    //     }


    //     await calendar.events.insert({
    //         calendarId: "primary",
    //         requestBody: {
    //             summary: booking.summary,
    //             description: booking.description,
    //             start: { dateTime: start.toISOString(), timeZone: "Asia/Kolkata" },
    //             end: { dateTime: end.toISOString(), timeZone: "Asia/Kolkata" },
    //         },
    //     });

    // }


    public async getAvailabilityByLocation(
        serviceSubCategoryId: string,
        userLat: number,
        userLng: number,
        radiusKm: number,
        timeMin: string,
        timeMax: string
    ): Promise<Array<{ providerId: string; providerName: string; availableSlots: calendar_v3.Schema$TimePeriod[] }>> {

        const startTime = Date.now();

        const services = await this._serviceRepository.findAll({ subCategoryId: serviceSubCategoryId });

        const providerIdSet = new Set<string>(
            services.map(s => s.providerId?.toString()).filter(Boolean) as string[]
        );

        if (providerIdSet.size === 0) {
            return [];
        }

        const providers = await this._providerRepository.findAll({
            _id: { $in: Array.from(providerIdSet) }
        });

        const providersInRange = providers.filter(p => {
            const coords = (p as any).serviceLocation?.coordinates as number[] | undefined;
            if (!coords || coords.length !== 2) {
                return false;
            }
            const [provLng, provLat] = coords;
            const distKm = this._haversineKm(userLat, userLng, provLat, provLng);
            const withinRange = distKm <= radiusKm;
            return withinRange;
        });

        const startISO = new Date(timeMin);
        const endISO = new Date(timeMax);

        // --- Step 4: Map provider → service duration ---
        const providerIdToDuration = new Map<string, string>();
        for (const s of services) {
            const pid = s.providerId?.toString();
            if (pid && s.duration && !providerIdToDuration.has(pid)) {
                providerIdToDuration.set(pid, s.duration);
            }
        }

        const results: Array<{ providerId: string; providerName: string; availableSlots: calendar_v3.Schema$TimePeriod[] }> = [];

        for (const provider of providersInRange) {
            const providerId = (provider._id as any).toString();
            const providerName = (provider as any).fullName || 'Provider';

            const existingBookings = await this._bookingRepository.findByProviderAndDateRange(
                provider._id.toString(),
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
                const dow = d.getDay();
                const dayName = Object.keys(dayMap).find(k => dayMap[k] === dow);
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

                    const overlaps = existingBookings.some((b: any) => {
                        if (!b.scheduledDate || !b.scheduledTime) return false;
                        const [bh, bm] = String(b.scheduledTime).split(':').map(Number);
                        const bStart = new Date(b.scheduledDate);
                        bStart.setHours(bh || 0, bm || 0, 0, 0);
                        const bEnd = new Date(bStart.getTime() + slotMs);
                        return slotStart < bEnd && slotEnd > bStart;
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

}
