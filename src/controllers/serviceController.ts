import { inject, injectable } from "inversify";
import TYPES from "../di/type";
import { IServiceService } from "../services/interface/IServiceService";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";
import { IAddAndEditServiceForm } from "../interface/service.dto";
import { NextFunction, Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { HttpStatusCode } from "../enums/HttpStatusCode";


@injectable()
export class ServiceController {
    private _serviceService: IServiceService
    constructor(@inject(TYPES.ServiceService) serviceService: IServiceService) {
        this._serviceService = serviceService;
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
                price: parseInt(req.body.price),
                userId: req.user.id,
            }
            const response = await this._serviceService.addService(serviceToAdd)
            res.status(200).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getServicesForProvider = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const providerId = req.params.providerId;
            const response = await this._serviceService.getProviderServices(providerId)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public getServiceById = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id;
            const response = await this._serviceService.getServiceById(id)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public updateService = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id

            const serviceToUpdate: IAddAndEditServiceForm = {
                ...req.body,
                status: req.body.status === "true",
                experience: parseInt(req.body.experience),
                price: parseInt(req.body.price),
                userId: req.user.id,
            }
            const response = await this._serviceService.updateService(id, serviceToUpdate)
            res.status(200).json(response)
        } catch (error) {
            next(error)
        }
    }

    public deleteService = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id
            const response = await this._serviceService.deleteService(id)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }
}