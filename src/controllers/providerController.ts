import { inject, injectable } from "inversify";
import { Request, Response, NextFunction } from 'express';
import { IProviderService } from "../services/interface/IProviderService";
import TYPES from "../di/type";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";
import { IProviderRegistrationData } from "../interface/provider";
import { AuthRequest } from "../middleware/authMiddleware";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { ResendOtpRequestBody, VerifyOtpRequestBody } from "../interface/auth";
import { ZodError } from "zod";
import { z } from "zod";

import {
    registerProviderSchema,
    updateProviderSchema,
    providersForAdminQuerySchema,
    updateProviderStatusSchema,
    paramIdSchema,
    getServiceProviderQuerySchema,
    getAvailabilityQuerySchema,
    getEarningsQuerySchema,
    featuredProvidersQuerySchema,
    updateAvailabilitySchema,
    searchQuerySchema
} from '../utils/validations/provider.validation';
import { verifyOtpSchema, emailOnlySchema } from "../utils/validations/auth.validation";
@injectable()
export class ProviderController {
    private _providerService: IProviderService
    constructor(@inject(TYPES.ProviderService) providerService: IProviderService) {
        this._providerService = providerService
    }

    public register = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {

            const validatedBody = registerProviderSchema.parse(req.body);

            const files = req.files as {
                aadhaarIdProof?: Express.Multer.File[];
                profilePhoto?: Express.Multer.File[];
            };

            const aadhaar = files?.aadhaarIdProof?.[0];
            const profile = files?.profilePhoto?.[0];

            const aadhaarUrl = aadhaar ? (await uploadToCloudinary(aadhaar.path)) : '';
            const profileUrl = profile ? (await uploadToCloudinary(profile.path)) : '';

            const [lat, lon] = validatedBody.serviceLocation.split(",").map(Number);

            const formData: IProviderRegistrationData = {
                ...validatedBody,
                aadhaarIdProof: aadhaarUrl,
                profilePhoto: profileUrl,
                userId: req.user?.id,
                serviceLocation: { type: "Point" as const, coordinates: [lon, lat] }

            };

            const response = await this._providerService.registerProvider(formData);
            res.status(HttpStatusCode.OK).json(response);
        } catch (error) {
            next(error);
        }
    };

    public verifyOtp = async (req: Request<{}, {}, VerifyOtpRequestBody>, res: Response, next: NextFunction) => {
        try {
            const validatedBody = verifyOtpSchema.parse(req.body);
            const response = await this._providerService.verifyOtp(validatedBody);
            res.status(HttpStatusCode.OK).json(response);
        } catch (error) {
            next(error);
        }
    }

    public resendOtp = async (req: Request<{}, {}, ResendOtpRequestBody>, res: Response, next: NextFunction) => {
        try {
            const validatedBody = emailOnlySchema.parse(req.body);
            const response = await this._providerService.resendOtp(validatedBody);
            res.status(HttpStatusCode.OK).json(response);
        } catch (error) {
            next(error);
        }
    }

    public updateProvider = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {

            const validatedBody = updateProviderSchema.parse(req.body);

            const files = req.files as {
                aadhaarIdProof?: Express.Multer.File[];
                profilePhoto?: Express.Multer.File[];
            };

            const aadhaar = files?.aadhaarIdProof?.[0];
            const profile = files?.profilePhoto?.[0];

            const aadhaarUrl = aadhaar
                ? (await uploadToCloudinary(aadhaar.path)) : undefined;
            const profileUrl = profile
                ? (await uploadToCloudinary(profile.path)) : undefined;

            let lat: number | undefined;
            let lon: number | undefined;
            if (validatedBody.serviceLocation) {
                [lat, lon] = validatedBody.serviceLocation.split(",").map(Number);
            }

            const updateData: Partial<IProviderRegistrationData> = {
                ...validatedBody,
                userId: req.user.id,
                serviceLocation: { type: "Point", coordinates: [lon, lat] }
            };

            if (lat !== undefined && lon !== undefined && !isNaN(lat) && !isNaN(lon)) {
                updateData.serviceLocation = { type: "Point", coordinates: [lon, lat] };
            } else {
                updateData.serviceLocation = undefined;
            }

            if (profileUrl) {
                updateData.profilePhoto = profileUrl;
            }
            if (aadhaarUrl) {
                updateData.aadhaarIdProof = aadhaarUrl;
            }

            const updatedProvider = await this._providerService.updateProviderDetails(updateData);

            res.status(HttpStatusCode.OK).json({
                provider: updatedProvider,
                message: "Profile updated successfully",
            });
        } catch (error) {
            if (error instanceof ZodError) res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error);
        }
    }

    public getAllProvidersList = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const providerWithDetails = await this._providerService.getProviderWithAllDetails();
            res.status(HttpStatusCode.OK).json(providerWithDetails);
        } catch (error) {
            next(error);
        }
    }

    public getProvider = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const token = req.cookies.token
            const provider = await this._providerService.fetchProviderById(token)
            res.status(HttpStatusCode.OK).json(provider)
        } catch (error) {
            next(error);
        }
    }

    public getServicesForAddPage = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const response = await this._providerService.getServicesForAddservice();
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getProvidersforAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { page, limit, search, status, rating } = providersForAdminQuerySchema.parse(req.query);
            const providersDetails = await this._providerService.providersForAdmin(page, limit, search, status, rating);
            res.status(HttpStatusCode.OK).json(providersDetails);
        } catch (error) {
            next(error);
        }
    }

    public featuredProviders = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { page = 1, limit = 10, search = '' } = featuredProvidersQuerySchema.parse(req.query);
            const getFeaturedProviders = await this._providerService.getFeaturedProviders(page, limit, search)
            res.status(HttpStatusCode.OK).json(getFeaturedProviders)
        } catch (error) {
            if (error instanceof ZodError) res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error);
        }

    }

    public updateProviderStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = paramIdSchema.parse(req.params);
            const { newStatus, reason } = updateProviderStatusSchema.parse(req.body);
            const response = await this._providerService.updateProviderStat(id, newStatus, reason)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getServiceProvider = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const validatedQuery = getServiceProviderQuerySchema.parse(req.query);
            const userId = req.user.id;

            const filtersForService = {
                lat: validatedQuery.latitude,
                long: validatedQuery.longitude,
                radius: validatedQuery.radius ?? 10,
                experience: validatedQuery.experience,
                date: validatedQuery.date,
                time: validatedQuery.time,
                price: validatedQuery.price
            };

            const response = await this._providerService.getProviderwithFilters(userId, validatedQuery.serviceId, filtersForService)
            res.status(200).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getProviderForChatPage = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {

            const { search } = searchQuerySchema.parse(req.query);

            const userId = req.user.id
            const response = await this._providerService.providerForChatPage(userId, search)
            console.log('the respose', response)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getProviderDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user.id
            const response = await this._providerService.getProviderDashboard(userId)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getProviderAvailability = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {

            const query = getAvailabilityQuerySchema.parse(req.query);
            const userId = req.user.id;

            const response = await this._providerService.getAvailabilityByLocation(
                userId,
                query.serviceId,
                query.latitude,
                query.longitude,
                query.radius ?? 10,
                query.timeMin,
                query.timeMax
            );

            res.status(HttpStatusCode.OK).json(response);
        } catch (error) {
            next(error);
        }
    };

    public getEarningsAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { period } = getEarningsQuerySchema.parse(req.query);
            const userId = req.user.id;

            const analyticsData = await this._providerService.getEarningsAnalytics(userId, period);
            console.log(analyticsData)

            res.status(HttpStatusCode.OK).json({ success: true, data: analyticsData });
        } catch (error) {
            next(error);
        }
    }

    public getPerformance = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user.id;

            const performanceData = await this._providerService.getProviderPerformance(userId);

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: "Provider performance fetched successfully",
                data: performanceData
            });
        } catch (error) {
            next(error);
        }
    };

    public getAvailability = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user.id;
            const availability = await this._providerService.getAvailability(userId);
            res.status(HttpStatusCode.OK).json({ success: true, data: availability });
        } catch (error) {
            next(error);
        }
    }

    public updateAvailability = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user.id;

            const data = updateAvailabilitySchema.parse(req.body);

            const availability = await this._providerService.updateAvailability(userId, data);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: "Availability updated successfully",
                data: availability
            });
        } catch (error) {
            if (error instanceof ZodError) res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error);
        }
    }

    public getPublicProviderDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {

            const { providerId } = req.params;
            
            const response = await this._providerService.getPublicProviderDetails(providerId);
            
            res.status(HttpStatusCode.OK).json({ success: true, data: response });
        } catch (error) {
            if (error instanceof ZodError) res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error);
        }
    }

    public getProviderFullDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = paramIdSchema.parse(req.params); 
            const data = await this._providerService.getProviderFullDetails(id);
            res.status(HttpStatusCode.OK).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }


}

