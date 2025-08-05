import { inject, injectable } from "inversify";
import TYPES from "../di/type";
import { IServiceService } from "../services/interface/IServiceService";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";
import { IAddAndEditServiceForm } from "../dto/service.dto";
import { NextFunction, Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";


@injectable()
export class ServiceController {
    private serviceService: IServiceService
    constructor(@inject(TYPES.ServiceService) serviceService: IServiceService) {
        this.serviceService = serviceService;
    }

    public addService = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const files = req.files as {
                businessCertification?: Express.Multer.File[];
            };

            const certificate = files?.businessCertification?.[0]
            const baseUrl = process.env.CLOUDINARY_BASE_URL;

            const businessCertificationUrl = certificate ? (await uploadToCloudinary(certificate.path)).replace(baseUrl, '') : '';



            const serviceToAdd: IAddAndEditServiceForm = {
                ...req.body,
                status: req.body.status === "true",
                businessCertification: businessCertificationUrl,
                experience: parseInt(req.body.experience),
                basePrice: parseInt(req.body.basePrice),
                price: parseInt(req.body.price),
                userId: req.user.id,
            }
            const response = await this.serviceService.addService(serviceToAdd)
            res.status(200).json(response)
        } catch (error) {
            next(error)
        }
    }
}