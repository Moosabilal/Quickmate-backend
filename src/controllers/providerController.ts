import { inject, injectable } from "inversify";
import { Request, Response, NextFunction } from 'express';
import { IProviderService } from "../services/interface/IProviderService";
import TYPES from "../di/type";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";
import { IProviderRegisterRequest } from "../types/provider";
import { AuthRequest } from "../middleware/authMiddleware";

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
                businessCertifications?: Express.Multer.File[];
            };

            const _userId = req.user?.id

            const aadhaar = files?.aadhaarIdProof?.[0];
            const profile = files?.profilePhoto?.[0];
            const certification = files?.businessCertifications?.[0];

            const baseUrl = process.env.CLOUDINARY_BASE_URL;

            const aadhaarUrl = aadhaar ? (await uploadToCloudinary(aadhaar.path)).replace(baseUrl, '') : '';
            const profileUrl = profile ? (await uploadToCloudinary(profile.path)).replace(baseUrl, '') : '';
            const certificationUrl = certification ? (await uploadToCloudinary(certification.path)).replace(baseUrl, '') : '';

            const formData = {
                ...req.body,
                timeSlot: {
                    startTime: req.body.startTime,
                    endTime: req.body.endTime,
                },
                verificationDocs: {
                    aadhaarIdProof: aadhaarUrl,
                    businessCertifications: certificationUrl,
                },
                profilePhoto: profileUrl,
                userId: req.user?.id

            };
            delete formData.startTime;
            delete formData.endTime;

            const response = await this.providerService.registerProvider(formData);
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };

    public getAllProvidersList = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const providerWithDetails = await this.providerService.getProviderWithAllDetails();
            res.status(200).json(providerWithDetails);
        } catch (error) {
            next(error);
        }
    }

    public getProvidersforAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = (req.query.search as string) || '';
            const status = req.query.status as string || "All"
            const providersDetails = await this.providerService.providersForAdmin(page, limit, search, status);
            res.status(200).json(providersDetails);
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
            res.status(200).json(getFeaturedProviders)
        } catch (error) {
            next(error);
        }

    }

}