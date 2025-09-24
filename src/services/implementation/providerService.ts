import { inject, injectable } from "inversify";
import { IProviderRepository } from "../../repositories/interface/IProviderRepository";
import { IProviderService } from "../interface/IProviderService";
import TYPES from "../../di/type";
import { calendar_v3 } from "googleapis";
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
import { google } from "googleapis";

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
            console.log('provieder createing')
            provider = await this._providerRepository.createProvider(data);
        } else if (provider && provider.status === ProviderStatus.REJECTED) {
            provider = await this._providerRepository.updateProvider(data)
        } else {
            console.log('the second else condigiton')
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
        console.log('the bakcend rprovider ', provider)
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

    // public async getProviderwithFilters(
    //     userId: string,
    //     subCategoryId: string,
    //     filters: {
    //         area?: string;
    //         experience?: number;
    //         day?: string;
    //         time?: string;
    //         price?: number;
    //         radius?: number;
    //         locationCoords?: string;
    //     }
    // ): Promise<IBackendProvider[]> {
    //     console.log('the fitler', filters)
    //     const serviceFilter: any = {
    //         subCategoryId: subCategoryId,
    //     };

    //     if (filters.experience) {
    //         serviceFilter.experience = { $gte: filters.experience };
    //     }

    //     if (filters.price) {
    //         serviceFilter.price = { $lte: filters.price };
    //     }

    //     const services = await this._serviceRepository.findAll(serviceFilter);

    //     if (!services || services.length === 0) return [];

    //     const servicesByProvider = new Map<string, IService[]>();
    //     services.forEach(service => {
    //         const pid = service.providerId.toString();
    //         if (!servicesByProvider.has(pid)) {
    //             servicesByProvider.set(pid, []);
    //         }
    //         servicesByProvider.get(pid)!.push(service);
    //     });


    //     const providerIds = Array.from(servicesByProvider.keys());

    //     const providerFilter: any = {
    //         _id: { $in: providerIds.map(id => new mongoose.Types.ObjectId(id)) },
    //         userId: { $ne: userId }
    //     };

    //     if (filters.area) {
    //         providerFilter.serviceArea = { $regex: new RegExp(filters.area, 'i') };
    //     }

    //     if (filters.day || filters.time) {
    //         providerFilter.availability = {
    //             $elemMatch: {} as any
    //         };

    //         if (filters.day) {
    //             providerFilter.availability.$elemMatch.day = filters.day;
    //         }

    //         if (filters.time) {
    //             providerFilter.availability.$elemMatch.startTime = { $lte: filters.time };
    //             providerFilter.availability.$elemMatch.endTime = { $gte: filters.time };
    //         }
    //     }


    //     console.log('the 2 filters ', filters)



    //     if (filters.locationCoords && filters.radius) {
    //         const [lat, lng] = filters.locationCoords.split(',').map(Number);

    //         let a  = providerFilter.serviceLocation = {
    //             $near: {
    //                 $geometry: {
    //                     type: "Point",
    //                     coordinates: [lng, lat], 
    //                 },
    //                 $maxDistance: filters.radius * 1000,
    //             }
    //         };

    //         console.log("aaaaaaaaaaaaaaaaa", a)
    //     }


    //     const providers = await this._providerRepository.findAll(providerFilter);
    //     const serviceIds = [...new Set(services.map(s => s._id.toString()))];
    //     const reviews = await this._reviewRepository.findAll({
    //         providerId: { $in: providerIds },
    //         serviceId: { $in: serviceIds }
    //     });

    //     const userIds = [...new Set(reviews.map(r => r.userId.toString()))];
    //     const users = await this._userRepository.findAll({
    //         _id: { $in: userIds }
    //     });

    //     const userMap = new Map(
    //         users.map(u => [u._id.toString(), { name: String(u.name), profilePicture: String(u.profilePicture || ""), }])
    //     );

    //     const reviewsByProvider = new Map<string, IReviewsOfUser[]>();

    //     reviews.forEach(review => {
    //         const pid = review.providerId.toString();

    //         if (!reviewsByProvider.has(pid)) {
    //             reviewsByProvider.set(pid, []);
    //         }

    //         const userData = userMap.get(review.userId.toString());

    //         reviewsByProvider.get(pid)!.push({
    //             userName: userData?.name || "Unknown User",
    //             userImg: userData?.profilePicture || "",
    //             rating: Number(review.rating),
    //             review: String(review.reviewText),
    //         });
    //     });

    //     const result: IBackendProvider[] = providers.map(provider => {
    //         const providerServices = servicesByProvider.get(provider._id.toString()) || [];

    //         const primaryService = providerServices[0];

    //         return {
    //             _id: provider._id.toString(),
    //             fullName: provider.fullName,
    //             phoneNumber: provider.phoneNumber,
    //             email: provider.email,
    //             profilePhoto: provider.profilePhoto,
    //             serviceArea: provider.serviceArea,
    //             serviceLocation: `${provider.serviceLocation.coordinates[1]},${provider.serviceLocation.coordinates[0]}`,
    //             availability: provider.availability,
    //             status: provider.status,
    //             earnings: provider.earnings,
    //             totalBookings: provider.totalBookings,
    //             experience: primaryService?.experience || 0,
    //             price: primaryService?.price || 0,
    //             reviews: reviewsByProvider.get(provider._id.toString()) || [],
    //         };
    //     });

    //     return result;
    // }


    public async getProviderwithFilters(
        userId: string,
        subCategoryId: string,
        filters: {
            area?: string;
            experience?: number;
            day?: string;
            time?: string;
            price?: number;
            radius?: number;
            locationCoords?: string;
        }
    ): Promise<IBackendProvider[]> {
        // console.log('▶ Filters received:', filters);

        const serviceFilter: any = {
            subCategoryId: subCategoryId,
        };

        if (filters.experience) {
            serviceFilter.experience = { $gte: filters.experience };
        }

        if (filters.price) {
            serviceFilter.price = { $lte: filters.price };
        }

        // console.log('▶ Service filter:', serviceFilter);

        const services = await this._serviceRepository.findAll(serviceFilter);
        // console.log('▶ Services found:', services?.length || 0);

        if (!services || services.length === 0) {
            // console.log('⚠ No services found for filters.');
            return [];
        }

        const servicesByProvider = new Map<string, IService[]>();
        services.forEach(service => {
            const pid = service.providerId.toString();
            if (!servicesByProvider.has(pid)) {
                servicesByProvider.set(pid, []);
            }
            servicesByProvider.get(pid)!.push(service);
        });

        // console.log('▶ Services grouped by provider:', servicesByProvider.size);

        const providerIds = Array.from(servicesByProvider.keys());
        // console.log('▶ Provider IDs extracted:', providerIds);

        const providerFilter: any = {
            _id: { $in: providerIds.map(id => new mongoose.Types.ObjectId(id)) },
            userId: { $ne: userId }
        };

        if (filters.area) {
            providerFilter.serviceArea = { $regex: new RegExp(filters.area, 'i') };
        }

        if (filters.day || filters.time) {
            providerFilter.availability = { $elemMatch: {} as any };

            if (filters.day) {
                providerFilter.availability.$elemMatch.day = filters.day;
            }

            if (filters.time) {
                providerFilter.availability.$elemMatch.startTime = { $lte: filters.time };
                providerFilter.availability.$elemMatch.endTime = { $gte: filters.time };
            }
        }

        // console.log('▶ Provider filter before location:', JSON.stringify(providerFilter, null, 2));

        if (filters.locationCoords && filters.radius) {
            const [lat, lng] = filters.locationCoords.split(',').map(Number);

            providerFilter.serviceLocation = { // UPDATED: applied geospatial filter correctly
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [lng, lat],
                    },
                    $maxDistance: filters.radius * 1000,
                }
            };

            // console.log("▶ Geospatial filter applied:", providerFilter.serviceLocation);
        }

        const providers = await this._providerRepository.findAll(providerFilter);
        // console.log('▶ Providers found before deduplication:', providers?.length || 0);

        // UPDATED: Deduplicate providers
        const uniqueProvidersMap = new Map<string, typeof providers[0]>();
        providers.forEach(provider => {
            uniqueProvidersMap.set(provider._id.toString(), provider);
        });

        const uniqueProviders = Array.from(uniqueProvidersMap.values());
        // console.log('▶ Providers after deduplication:', uniqueProviders.length);

        const serviceIds = [...new Set(services.map(s => s._id.toString()))];
        // console.log('▶ Service IDs for reviews:', serviceIds);

        const reviews = await this._reviewRepository.findAll({
            providerId: { $in: providerIds },
            serviceId: { $in: serviceIds }
        });
        // console.log('▶ Reviews found:', reviews?.length || 0);

        const userIds = [...new Set(reviews.map(r => r.userId.toString()))];
        // console.log('▶ User IDs from reviews:', userIds);

        const users = await this._userRepository.findAll({
            _id: { $in: userIds }
        });
        // console.log('▶ Users fetched:', users?.length || 0);

        const userMap = new Map(
            users.map(u => [u._id.toString(), { name: String(u.name), profilePicture: String(u.profilePicture || ""), }])
        );
        // console.log('▶ User map size:', userMap.size);

        const reviewsByProvider = new Map<string, IReviewsOfUser[]>();

        reviews.forEach(review => {
            const pid = review.providerId.toString();

            if (!reviewsByProvider.has(pid)) {
                reviewsByProvider.set(pid, []);
            }

            const userData = userMap.get(review.userId.toString());

            reviewsByProvider.get(pid)!.push({
                userName: userData?.name || "Unknown User",
                userImg: userData?.profilePicture || "",
                rating: Number(review.rating),
                review: String(review.reviewText),
            });
        });

        // console.log('▶ Reviews grouped by provider:', reviewsByProvider.size);

        const result: IBackendProvider[] = uniqueProviders.map(provider => { // UPDATED: use deduplicated providers
            const providerServices = servicesByProvider.get(provider._id.toString()) || [];
            const primaryService = providerServices[0];

            return {
                _id: provider._id.toString(),
                fullName: provider.fullName,
                phoneNumber: provider.phoneNumber,
                email: provider.email,
                profilePhoto: provider.profilePhoto,
                serviceArea: provider.serviceArea,
                serviceLocation: `${provider.serviceLocation.coordinates[1]},${provider.serviceLocation.coordinates[0]}`,
                availability: provider.availability,
                status: provider.status,
                earnings: provider.earnings,
                totalBookings: provider.totalBookings,
                experience: primaryService?.experience || 0,
                price: primaryService?.price || 0,
                reviews: reviewsByProvider.get(provider._id.toString()) || [],
            };
        });

        console.log('▶ Final result length:', result.length);

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

    public async initiateGoogleAuth(userId: string): Promise<{ url: string }> {
        console.log('initiating')
        const oAuth2Client = getOAuthClient();
        console.log('the oauth cleainet', oAuth2Client)

        // const scopes = [
        //     'https://www.googleapis.com/auth/calendar' // Read/write access
        // ];

        const url = getAuthUrl(userId);
        console.log('the url sended to frontend', url)

        return { url };
    }


    public async googleCallback(code: string, userId: string): Promise<{ message: string }> {
        console.log('the google callback si working')
        const oAuth2Client = getOAuthClient();

        const { tokens } = await oAuth2Client.getToken(code);
        console.log('the toke for the google', tokens)
        oAuth2Client.setCredentials(tokens);

        const data = await this._userRepository.update(userId, {
            "googleCalendar.tokens": tokens
        });
        console.log('the udpated provider', data)
        const user = await this._userRepository.findById(userId)

        const provider = await this._providerRepository.findOne({ userId: userId })

        if (!user?.googleCalendar?.tokens) {
            throw new CustomError("Google Calendar is not connected for this provider.", HttpStatusCode.BAD_REQUEST);
        }
        oAuth2Client.setCredentials(user.googleCalendar.tokens);
        const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

        const eventSummary = "My Working Hours"; // Use a unique summary to identify these events

        // --- 1. DELETE OLD SCHEDULED EVENTS ---
        // First, find all existing "Working Hours" events we've created before.
        try {
            const { data } = await calendar.events.list({
                calendarId: "primary",
                q: eventSummary, // Search for events with our unique summary
                showDeleted: false,
            });

            console.log(data, "data data data dtaa ")

            if (data.items) {
                // Delete each old event one by one
                for (const event of data.items) {
                    if (event.id) {
                        await calendar.events.delete({
                            calendarId: "primary",
                            eventId: event.id,
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Could not clear old availability events, proceeding to create new ones.", error);
        }


        // --- 2. CREATE NEW RECURRING EVENTS ---
        const weekDays: { [key: string]: number } = {
            'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
            'Thursday': 4, 'Friday': 5, 'Saturday': 6
        };

        for (const slot of provider.availability) {
            const dayName = slot.day;
            const dayNumber = weekDays[dayName];

            if (dayNumber === undefined) continue; // Skip if day is invalid

            // Calculate the date for the next occurrence of this weekday
            const now = new Date();
            const nextDayDate = new Date(now);
            nextDayDate.setDate(now.getDate() + (dayNumber - now.getDay() + 7) % 7);

            // Set the start and end times for the event
            const [startHour, startMinute] = slot.startTime.split(':').map(Number);
            const [endHour, endMinute] = slot.endTime.split(':').map(Number);

            const startDate = new Date(nextDayDate.setHours(startHour, startMinute, 0, 0));
            const endDate = new Date(nextDayDate.setHours(endHour, endMinute, 0, 0));

            const event = {
                summary: eventSummary,
                description: "Time slot marked as available for bookings.",
                start: {
                    dateTime: startDate.toISOString(),
                    timeZone: "Asia/Kolkata", // Or get this from provider settings
                },
                end: {
                    dateTime: endDate.toISOString(),
                    timeZone: "Asia/Kolkata",
                },
                // This rule makes the event repeat weekly on the specified day
                recurrence: [
                    `RRULE:FREQ=WEEKLY;BYDAY=${dayName.substring(0, 2).toUpperCase()}` // e.g., MO, TU, WE
                ],
            };

            try {

                const a = await calendar.events.insert({
                    calendarId: "primary",
                    requestBody: event,
                });
                console.log(a, "creating the calender aaaaaaaaa")
            } catch (error) {
                console.error(`Failed to create event for ${dayName}`, error);
                // Decide if you want to throw an error and stop, or just log and continue
            }
        }

        return { message: "Google Calendar connected!" }
    }

    public async createCalendarEvent(
        providerId: string,
        serviceId: string,
        booking: {
            summary: string;
            description: string;
            start: Date | string; // allow string from controller
        }
    ): Promise<void> {
        console.log("creating provider calendar in service", providerId, booking);

        const provider = await this._providerRepository.findById(providerId);
        const user = await this._userRepository.findById(provider._id.toString())
        if (!user?.googleCalendar?.tokens) return;

        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        oAuth2Client.setCredentials(user.googleCalendar.tokens);

        const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

        // 🔹 Parse the service for duration
        const service = await this._serviceRepository.findOne({ subCategoryId: serviceId, providerId });
        if (!service) throw new Error("Service not found");
        console.log("the service we got", service);

        // 🔹 Normalize booking.start
        const start = new Date(booking.start);
        if (isNaN(start.getTime())) {
            throw new Error("Invalid booking start date");
        }

        // 🔹 Parse service.duration ("HH:mm")
        let end = new Date(start);
        if (service.duration) {
            const [hours, minutes] = service.duration.split(":").map(Number);
            end.setHours(end.getHours() + (hours || 0));
            end.setMinutes(end.getMinutes() + (minutes || 0));
        } else {
            // fallback: 1 hour default
            end = new Date(start.getTime() + 60 * 60000);
        }

        console.log('the start and end datae', start, end)

        await calendar.events.insert({
            calendarId: "primary",
            requestBody: {
                summary: booking.summary,
                description: booking.description,
                start: { dateTime: start.toISOString(), timeZone: "Asia/Kolkata" },
                end: { dateTime: end.toISOString(), timeZone: "Asia/Kolkata" },
            },
        });

        console.log("the event successfully inserted");
    }


    // public async getProviderAvailability(providerIds: string[]) {

    //     console.log("yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy")
    //     const provider = await this._providerRepository.findById(providerId);
    //     const user = await this._userRepository.findById(provider.userId.toString())
    //     if (!user?.googleCalendar?.tokens) return [];

    //     const oAuth2Client = new google.auth.OAuth2(
    //         process.env.GOOGLE_CLIENT_ID,
    //         process.env.GOOGLE_CLIENT_SECRET,
    //         process.env.GOOGLE_REDIRECT_URI
    //     );
    //     oAuth2Client.setCredentials(user.googleCalendar.tokens);

    //     const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
    //     console.log('we are getitg the calendar in gerProviderAbailability', calendar)

    //     const now = new Date();
    //     const weekAhead = new Date();
    //     weekAhead.setDate(now.getDate() + 7);
    //     console.log('the now and weekahead', now, weekAhead)

    //     const freeBusy = await calendar.freebusy.query({
    //         requestBody: {
    //             timeMin: now.toISOString(),
    //             timeMax: weekAhead.toISOString(),
    //             items: [{ id: "primary" }],
    //         },
    //     });

    //     console.log('the the a baolaksdnfkasd return ', freeBusy)
    //     console.log('the availabitlty return ', freeBusy.data.calendars["primary"].busy)

    //     return freeBusy.data.calendars["primary"].busy;
    // }


    public async getProviderAvailability(providerIds: string[]) {
        console.log("Fetching availability for providerIds:", providerIds);

        const results: Record<string, calendar_v3.Schema$TimePeriod[]> = {};

        for (const providerId of providerIds) {
            const provider = await this._providerRepository.findById(providerId);
            if (!provider) {
                results[providerId] = [];
                continue;
            }

            const user = await this._userRepository.findById(provider.userId.toString());
            if (!user?.googleCalendar?.tokens) {
                results[providerId] = [];
                continue;
            }

            const oAuth2Client = getOAuthClient()
            oAuth2Client.setCredentials(user.googleCalendar.tokens);

            const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

            const now = new Date();
            const weekAhead = new Date();
            weekAhead.setDate(now.getDate() + 7);

            const freeBusy = await calendar.freebusy.query({
                requestBody: {
                    timeMin: now.toISOString(),
                    timeMax: weekAhead.toISOString(),
                    items: [{ id: "primary" }],
                },
            });

            const busyTimes = freeBusy.data.calendars?.primary?.busy ?? [];

            // ✅ Deduplicate
            const uniqueBusy = Array.from(
                new Map(
                    busyTimes
                        .filter(slot => slot.start && slot.end) // ensure not null/undefined
                        .map(slot => [`${slot.start}-${slot.end}`, slot])
                ).values()
            );

            console.log(`Provider ${providerId} busy slots (unique):`, uniqueBusy);

            results[providerId] = uniqueBusy;
        }

        return results;
    }

}