import { inject, injectable } from "inversify";
import { Request, Response, NextFunction } from 'express';
import { IProviderService } from "../services/interface/IProviderService";
import TYPES from "../di/type";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";
import { IProviderRegistrationData } from "../interface/provider";
import { AuthRequest } from "../middleware/authMiddleware";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { ResendOtpRequestBody, VerifyOtpRequestBody } from "../interface/auth";
import { IProvider } from "../models/Providers";
import { getOAuthClient } from "../utils/googleCalendar";
import { ZodError } from "zod";

// --- Import all the new Zod schemas ---
import {
    registerProviderSchema,
    updateProviderSchema,
    providersForAdminQuerySchema,
    updateProviderStatusSchema,
    mongoIdParamSchema,
    getServiceProviderQuerySchema,
    getAvailabilityQuerySchema,
    getEarningsQuerySchema
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

            const baseUrl = process.env.CLOUDINARY_BASE_URL;

            const aadhaarUrl = aadhaar ? (await uploadToCloudinary(aadhaar.path)).replace(baseUrl, '') : '';
            const profileUrl = profile ? (await uploadToCloudinary(profile.path)).replace(baseUrl, '') : '';

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

            const files = req.files as {
                aadhaarIdProof?: Express.Multer.File[];
                profilePhoto?: Express.Multer.File[];
            };

            const aadhaar = files?.aadhaarIdProof?.[0];
            const profile = files?.profilePhoto?.[0];

            const baseUrl = process.env.CLOUDINARY_BASE_URL;

            const aadhaarUrl = aadhaar
                ? (await uploadToCloudinary(aadhaar.path)).replace(baseUrl, '')
                : undefined;
            const profileUrl = profile
                ? (await uploadToCloudinary(profile.path)).replace(baseUrl, '')
                : undefined;

            let lat: number | undefined;
            let lon: number | undefined;
            if (req.body.serviceLocation) {
                [lat, lon] = req.body.serviceLocation.split(",").map(Number);
            }

            const updateData: IProviderRegistrationData = {
                ...req.body,
                availability: JSON.parse(req.body.availability || '[]'),
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
            const { page, limit, search, status } = providersForAdminQuerySchema.parse(req.query);
            const providersDetails = await this._providerService.providersForAdmin(page, limit, search, status);
            res.status(HttpStatusCode.OK).json(providersDetails);
        } catch (error) {
            next(error);
        }
    }

    public featuredProviders = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = (req.query.search as string) || '';
            const getFeaturedProviders = await this._providerService.getFeaturedProviders(page, limit, search)
            res.status(HttpStatusCode.OK).json(getFeaturedProviders)
        } catch (error) {
            next(error);
        }

    }

    public updateProviderStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = mongoIdParamSchema.parse(req.params);
            const { newStatus } = updateProviderStatusSchema.parse(req.body);
            const response = await this._providerService.updateProviderStat(id, newStatus)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getServiceProvider = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const filters = getServiceProviderQuerySchema.parse(req.query);
            const userId = req.user.id;

            const response = await this._providerService.getProviderwithFilters(userId, filters.serviceId, filters)
            res.status(200).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getProviderForChatPage = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {

            const userId = req.user.id
            const response = await this._providerService.providerForChatPage(userId)
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

            res.status(HttpStatusCode.OK).json({ success: true, data: analyticsData });
        } catch (error) {
            next(error);
        }
    }

    public getPerformance = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user.id;

            const performanceData = await this._providerService.getProviderPerformance(userId);
            console.log('th rgggg', performanceData);

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: "Provider performance fetched successfully",
                data: performanceData
            });
        } catch (error) {
            next(error);
        }
    };


}

