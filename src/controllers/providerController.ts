import { inject, injectable } from "inversify";
import { Request, Response, NextFunction } from 'express';
import { IProviderService } from "../services/interface/IProviderService";
import TYPES from "../di/type";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";
import { IProviderProfile, IProviderRegisterRequest } from "../dto/provider.dto";
import { AuthRequest } from "../middleware/authMiddleware";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { ResendOtpRequestBody, VerifyOtpRequestBody } from "../dto/auth.dto";

@injectable()
export class ProviderController {
    private providerService: IProviderService
    constructor(@inject(TYPES.ProviderService) providerService: IProviderService) {
        this.providerService = providerService
    }

    public register = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {

            const files = req.files as {
                aadhaarIdProof?: Express.Multer.File[];
                profilePhoto?: Express.Multer.File[];
            };

            const aadhaar = files?.aadhaarIdProof?.[0];
            const profile = files?.profilePhoto?.[0];

            const baseUrl = process.env.CLOUDINARY_BASE_URL;

            const aadhaarUrl = aadhaar ? (await uploadToCloudinary(aadhaar.path)).replace(baseUrl, '') : '';
            const profileUrl = profile ? (await uploadToCloudinary(profile.path)).replace(baseUrl, '') : '';
            // const certificationUrl = certification ? (await uploadToCloudinary(certification.path)).replace(baseUrl, '') : '';



            const formData = {
                ...req.body,
                // timeSlot: JSON.parse(req.body.timeSlot),
                // verificationDocs: {
                //     aadhaarIdProof: aadhaarUrl,
                // },
                aadhaarIdProof: aadhaarUrl,
                availability: JSON.parse(req.body.availability || '[]'),
                profilePhoto: profileUrl,
                userId: req.user?.id

            };
            const [lat, lon] = req.body.serviceLocation.split(",").map(Number);
            formData.serviceLocation = { type: "Point", coordinates: [lon, lat] };


            const response = await this.providerService.registerProvider(formData);
            res.status(HttpStatusCode.OK).json({ provider: response, message: "registration completed successfully" });
        } catch (error) {
            next(error);
        }
    };

    public verifyOtp = async (req: Request<{}, {}, VerifyOtpRequestBody>, res: Response, next: NextFunction) => {
        try {
            const response = await this.providerService.verifyOtp(req.body);
            res.status(HttpStatusCode.OK).json(response);
        } catch (error) {
            next(error);
        }
    }

    public resendOtp = async (req: Request<{}, {}, ResendOtpRequestBody>, res: Response, next: NextFunction) => {
        try {
            const response = await this.providerService.resendOtp(req.body);
            res.status(HttpStatusCode.OK).json(response);
        } catch (error) {
            next(error);
        }
    }

    public updateProvider = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {

            console.log('req.body ', req.body)

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

            const [lat, lon] = req.body.serviceLocation.split(",").map(Number);

            const updateData: Partial<IProviderProfile> = {
                ...req.body,
                serviceId: JSON.parse(req.body.serviceId),
                availability: JSON.parse(req.body.availability || '[]'),
                userId: req.user.id,
                serviceLocation: { type: "Point", coordinates: [lon, lat] }
            };


            if (profileUrl) {
                updateData.profilePhoto = profileUrl;
            }
            if (aadhaarUrl) {
                updateData.aadhaarIdProof = aadhaarUrl;
            }

            const updatedProvider = await this.providerService.updateProviderDetails(updateData);

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
            const providerWithDetails = await this.providerService.getProviderWithAllDetails();
            res.status(HttpStatusCode.OK).json(providerWithDetails);
        } catch (error) {
            next(error);
        }
    }

    public getProvider = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const token = req.cookies.token
            const provider = await this.providerService.fetchProviderById(token)
            res.status(HttpStatusCode.OK).json(provider)
        } catch (error) {
            next(error);
        }
    }

    public getServicesForAddPage = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const response = await this.providerService.getServicesForAddservice();
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getProvidersforAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = (req.query.search as string) || '';
            const status = req.query.status as string || "All"
            const providersDetails = await this.providerService.providersForAdmin(page, limit, search, status);
            console.log('the providers details', providersDetails)
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
            const getFeaturedProviders = await this.providerService.getFeaturedProviders(page, limit, search)
            res.status(HttpStatusCode.OK).json(getFeaturedProviders)
        } catch (error) {
            next(error);
        }

    }

    public updateProviderStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const response = await this.providerService.updateProviderStat(req.params.id, req.body.newStatus)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getServiceProvider = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const serviceId = req.query.serviceId as string;
            const area = req.query.area as string;
            const experience = req.query.experience ? Number(req.query.experience) : undefined;
            const day = req.query.day as string;
            const time = req.query.time as string;
            const price = req.query.price ? Number(req.query.price) : undefined;

            const filters = { area, experience, day, time, price };
            const response = await this.providerService.getProviderwithFilters(serviceId, filters)
            res.status(200).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getProviderForChatPage = async (req: AuthRequest, res: Response, next: NextFunction ) => {
        try {
            const userId = req.user.id
            console.log('the userId', userId)
            const response = await this.providerService.providerForChatPage(userId)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

}