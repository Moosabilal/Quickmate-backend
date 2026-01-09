var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { inject, injectable } from "inversify";
import TYPES from "../di/type.js";
import {} from "../services/interface/IServiceService.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";
import {} from "../interface/service.js";
import {} from "express";
import {} from "../middleware/authMiddleware.js";
import { HttpStatusCode } from "../enums/HttpStatusCode.js";
import { ZodError } from "zod";
import { addServiceSchema, updateServiceSchema, serviceIdParamSchema, providerIdParamSchema, } from "../utils/validations/service.validation.js";
let ServiceController = class ServiceController {
    _serviceService;
    constructor(serviceService) {
        this._serviceService = serviceService;
    }
    addService = async (req, res, next) => {
        try {
            const validatedBody = addServiceSchema.parse(req.body);
            const files = req.files;
            const certificate = files?.businessCertification?.[0];
            const businessCertificationUrl = certificate ? await uploadToCloudinary(certificate.path) : "";
            const serviceToAdd = {
                ...validatedBody,
                status: req.body.status === "true",
                businessCertification: businessCertificationUrl,
                experience: parseInt(req.body.experience),
                price: parseInt(req.body.price),
                userId: req.user.id,
            };
            const response = await this._serviceService.addService(serviceToAdd);
            res.status(200).json(response);
        }
        catch (error) {
            if (error instanceof ZodError)
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error);
        }
    };
    getServicesForProvider = async (req, res, next) => {
        try {
            const { providerId } = providerIdParamSchema.parse(req.params);
            const response = await this._serviceService.getProviderServices(providerId);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            if (error instanceof ZodError)
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error);
        }
    };
    getServiceById = async (req, res, next) => {
        try {
            const { id } = serviceIdParamSchema.parse(req.params);
            const response = await this._serviceService.getServiceById(id);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            if (error instanceof ZodError)
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error);
        }
    };
    updateService = async (req, res, next) => {
        try {
            const { id } = serviceIdParamSchema.parse(req.params);
            const validatedBody = updateServiceSchema.parse(req.body);
            const serviceToUpdate = {
                ...validatedBody,
                userId: req.user.id,
            };
            const response = await this._serviceService.updateService(id, serviceToUpdate);
            res.status(200).json(response);
        }
        catch (error) {
            if (error instanceof ZodError)
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error);
        }
    };
    deleteService = async (req, res, next) => {
        try {
            const { id } = serviceIdParamSchema.parse(req.params);
            const response = await this._serviceService.deleteService(id);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            if (error instanceof ZodError)
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error);
        }
    };
};
ServiceController = __decorate([
    injectable(),
    __param(0, inject(TYPES.ServiceService)),
    __metadata("design:paramtypes", [Object])
], ServiceController);
export { ServiceController };
