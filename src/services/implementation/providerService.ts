import { inject, injectable } from "inversify";
import { IProviderRepository } from "../../repositories/interface/IProviderRepository";
import { IProviderService } from "../interface/IProviderService";
import TYPES from "../../di/type";
import mongoose from "mongoose";
import { IProvider } from "../../models/Providers";
import { IFeaturedProviders, IProviderForAdminResponce, IProviderProfile, IServiceAddPageResponse } from "../../dto/provider.dto";
import { ICategoryRepository } from "../../repositories/interface/ICategoryRepository";
import jwt, { JwtPayload } from 'jsonwebtoken'
import { HttpStatusCode } from "../../enums/HttpStatusCode";
import { ErrorMessage } from "../../enums/ErrorMessage";
import { CustomError } from "../../utils/CustomError";
import { generateOTP } from "../../utils/otpGenerator";
import { sendVerificationEmail } from "../../utils/emailService";
import { ILoginResponseDTO, ResendOtpRequestBody, VerifyOtpRequestBody } from "../../dto/auth.dto";
import { IUserRepository } from "../../repositories/interface/IUserRepository";
import { Roles } from "../../enums/userRoles";
import { toProviderDTO, toServiceAddPage } from "../../mappers/provider.mapper";
import { toLoginResponseDTO } from "../../mappers/user.mapper";
import { ProviderStatus } from "../../enums/provider.enum";

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;


@injectable()
export class ProviderService implements IProviderService {
    private providerRepository: IProviderRepository
    private categoryRepository: ICategoryRepository;
    private userRepository: IUserRepository

    constructor(@inject(TYPES.ProviderRepository) providerRepository: IProviderRepository,
        @inject(TYPES.CategoryRepository) categoryRepository: ICategoryRepository,
        @inject(TYPES.UserRepository) userRepository: IUserRepository
    ) {
        this.providerRepository = providerRepository
        this.categoryRepository = categoryRepository
        this.userRepository = userRepository
    }

    public async registerProvider(data: IProvider): Promise<{ message: string, email: string }> {

        let provider = await this.providerRepository.findByEmail(data.email);
        console.log('the provider is not getting', provider)


        if (provider && provider.isVerified) {
            throw new CustomError(ErrorMessage.USER_ALREADY_EXISTS, HttpStatusCode.CONFLICT)
        }

        if (!provider) {
            provider = await this.providerRepository.createProvider(data);
        } else {
            console.log('the else condition is working')
            provider.fullName = data.fullName;
            provider.phoneNumber = data.phoneNumber;
            provider.isVerified = false;
        }
        console.log('the otop is generating')

        const otp = generateOTP();
        console.log('the otp', provider)

        provider.registrationOtp = otp;
        provider.registrationOtpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        provider.registrationOtpAttempts = 0;
        console.log('the provider is updateing')
        await this.providerRepository.update(provider);
        console.log('the provider is udpated successfully')
        console.log('sending email')
        await sendVerificationEmail(provider.email, otp);

        // return {
        //     id: savedProvider._id.toString(),
        //     userId: savedProvider.userId.toString(),
        //     fullName: savedProvider.fullName,
        //     phoneNumber: savedProvider.phoneNumber,
        //     email: savedProvider.email,
        //     serviceId: savedProvider.serviceId.toString(),
        //     serviceLocation: savedProvider.serviceLocation,
        //     serviceArea: savedProvider.serviceArea,
        //     profilePhoto: savedProvider.profilePhoto,
        //     price: savedProvider.price,
        //     status: savedProvider.status,
        //     aadhaarIdProof: savedProvider.aadhaarIdProof,
        //     // experience: savedProvider.experience,
        //     timeSlot: savedProvider.timeSlot,
        //     // verificationDocs: savedProvider.verificationDocs,
        //     availableDays: savedProvider.availableDays

        // }

        return {
            message: 'Registration successful! An OTP has been sent to your email for verification.',
            email: String(provider.email),
        }
    }

    public async verifyOtp(data: VerifyOtpRequestBody): Promise<{ provider?: IProviderProfile, user?: ILoginResponseDTO, message?: string }> {
        const { email, otp } = data;

        const provider = await this.providerRepository.findByEmail(email, true);

        if (!provider) {
            throw new CustomError(ErrorMessage.USER_NOT_FOUND, HttpStatusCode.NOT_FOUND)
        }

        if (provider.isVerified) {
            return { message: 'Account already verified.' };
        }

        if (typeof provider.registrationOtpAttempts === 'number' && provider.registrationOtpAttempts >= MAX_OTP_ATTEMPTS) {
            throw new CustomError(`Too many failed OTP attempts. Please request a new OTP.`, HttpStatusCode.FORBIDDEN);

        }

        if (!provider.registrationOtp || provider.registrationOtp !== otp) {
            provider.registrationOtpAttempts = (typeof provider.registrationOtpAttempts === 'number' ? provider.registrationOtpAttempts : 0) + 1;
            await this.providerRepository.update(provider);
            throw new CustomError('Invalid OTP. Please try again.', HttpStatusCode.BAD_REQUEST);
        }

        if (!provider.registrationOtpExpires || new Date() > provider.registrationOtpExpires) {
            provider.registrationOtp = undefined;
            provider.registrationOtpExpires = undefined;
            provider.registrationOtpAttempts = 0;
            await this.providerRepository.update(provider);
            throw new CustomError('OTP has expired. Please request a new one.', HttpStatusCode.BAD_REQUEST);
        }

        provider.isVerified = true;
        provider.registrationOtp = undefined;
        provider.registrationOtpExpires = undefined;
        provider.registrationOtpAttempts = 0;
        const updatedProvider = await this.providerRepository.update(provider);

        const userId = provider.userId.toString()
        const user = await this.userRepository.findById(userId)
        if (!user) {
            throw new CustomError("Something went wrong, Please contact admin", HttpStatusCode.FORBIDDEN)
        }
        user.role = Roles.PROVIDER
        const updatedUser = await this.userRepository.update(user)

        return {
            provider: toProviderDTO(updatedProvider),
            user: toLoginResponseDTO(updatedUser)
        };
    }

    public async resendOtp(data: ResendOtpRequestBody): Promise<{ message: string }> {
        const { email } = data;

        const provider = await this.providerRepository.findByEmail(email, true);

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

        await this.providerRepository.update(provider);

        await sendVerificationEmail(email, newOtp);

        return { message: 'A new OTP has been sent to your email.' };
    }

    public async updateProviderDetails(updateData: Partial<IProviderProfile>): Promise<IProviderProfile> {
        console.log('the update provider in service', updateData)
        const updatedProvider = await this.providerRepository.updateProvider(updateData)
        return {
            id: updatedProvider._id.toString(),
            userId: updatedProvider.userId.toString(),
            fullName: updatedProvider.fullName,
            phoneNumber: updatedProvider.phoneNumber,
            email: updatedProvider.email,
            serviceId: updatedProvider.serviceId.map(id => id.toString()),
            serviceLocation: updatedProvider.serviceLocation,
            serviceArea: updatedProvider.serviceArea,
            profilePhoto: updatedProvider.profilePhoto,
            // price: updatedProvider.price,
            status: updatedProvider.status,
            // aadhaarIdProof: updatedProvider.aadhaarIdProof,
            // experience: updatedProvider.experience,
            timeSlot: updatedProvider.timeSlot,
            // verificationDocs: updatedProvider.verificationDocs,
            availableDays: updatedProvider.availableDays, 
            earnings: updatedProvider.earnings,
            totalBookings: updatedProvider.totalBookings,
            payoutPending: updatedProvider.payoutPending,
            rating: updatedProvider.rating,
            isVerified: updatedProvider.isVerified,

        }

    }


    public async getProviderWithAllDetails(): Promise<IProvider[]> {
        return this.providerRepository.getAllProviders();
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
            this.providerRepository.findProvidersWithFilter(filter, skip, limit),
            this.providerRepository.countProviders(filter),
        ]);

        if (!providers || providers.length === 0) {
            const error = new Error('No providers found.');
            (error as any).statusCode = 404;
            throw error;
        }

        const categories = await this.categoryRepository.getAllCategories();
        const categoryMap = new Map(categories.map(cat => [cat._id.toString(), cat]));

        const data = providers.map(provider => {
            const category = categoryMap.get(provider.serviceId.toString());
            return {
                id: provider._id.toString(),
                userId: provider.userId.toString(),
                fullName: provider.fullName,
                phoneNumber: provider.phoneNumber,
                email: provider.email,
                serviceId: provider.serviceId.toString(),
                serviceArea: provider.serviceArea,
                profilePhoto: provider.profilePhoto,
                status: provider.status,
                servicesOffered: category?.name || null,
            };
        });

        return {
            data,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }

    public async getServicesForAddservice() : Promise<{mainCategories: IServiceAddPageResponse[], services: IServiceAddPageResponse[]}> {
        const categories = await this.categoryRepository.getAllCategories()
        const mainCategories = categories.filter(category => !category.parentId ).map(category => toServiceAddPage(category))
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

        const provider = await this.providerRepository.getProviderByUserId(decoded.id)
        return {
            id: provider._id.toString(),
            userId: provider.userId.toString(),
            fullName: provider.fullName,
            phoneNumber: provider.phoneNumber,
            email: provider.email,
            serviceId: provider.serviceId.map(id => id.toString()),
            serviceLocation: provider.serviceLocation,
            serviceArea: provider.serviceArea,
            profilePhoto: provider.profilePhoto,
            status: provider.status,
            aadhaarIdProof: provider.aadhaarIdProof,
            timeSlot: provider.timeSlot,
            availableDays: provider.availableDays,
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
        const providers = await this.providerRepository.findProvidersWithFilter(filter, skip, limit);
        const total = await this.providerRepository.countProviders(filter)

        const featuredProviders = providers.map(provider => ({
            id: provider._id.toString(),
            userId: provider.userId.toString(),
            fullName: provider.fullName,
            profilePhoto: provider.profilePhoto,
            // serviceName: provider.serviceName

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
        await this.providerRepository.updateStatusById(id, newStatus)
        return { message: "provider Status updated" }
    }

    public async getProviderwithFilters(serviceId: string, filters: { area?: string; experience?: number; day?: string; time?: string; price?: number }): Promise<IProvider[]> {
        const filterQuery: any = {
            serviceId: new mongoose.Types.ObjectId(serviceId),
        };

        if (filters.area) {
            filterQuery.serviceArea = { $regex: new RegExp(filters.area, 'i') };
        }

        if (filters.experience) {
            filterQuery.experience = { $gte: filters.experience };
        }

        if (filters.day) {
            filterQuery.availableDays = filters.day;
        }

        if (filters.time) {
            filterQuery['timeSlot.startTime'] = { $lte: filters.time };
            filterQuery['timeSlot.endTime'] = { $gte: filters.time };
        }

        if (filters.price) {
            filterQuery['price'] = { $lte: filters.price };
        }
        const provider = await this.providerRepository.getProviderByServiceId(filterQuery)

        return provider

    }






}