"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceController = void 0;
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../di/type"));
const cloudinaryUpload_1 = require("../utils/cloudinaryUpload");
const HttpStatusCode_1 = require("../enums/HttpStatusCode");
const zod_1 = require("zod");
const service_validation_1 = require("../utils/validations/service.validation");
let ServiceController = class ServiceController {
    constructor(serviceService) {
        this.addService = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const validatedBody = service_validation_1.addServiceSchema.parse(req.body);
                const files = req.files;
                const certificate = (_a = files === null || files === void 0 ? void 0 : files.businessCertification) === null || _a === void 0 ? void 0 : _a[0];
                const businessCertificationUrl = certificate ? (yield (0, cloudinaryUpload_1.uploadToCloudinary)(certificate.path)) : '';
                const serviceToAdd = Object.assign(Object.assign({}, validatedBody), { status: req.body.status === "true", businessCertification: businessCertificationUrl, experience: parseInt(req.body.experience), price: parseInt(req.body.price), userId: req.user.id });
                const response = yield this._serviceService.addService(serviceToAdd);
                res.status(200).json(response);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                next(error);
            }
        });
        this.getServicesForProvider = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { providerId } = service_validation_1.providerIdParamSchema.parse(req.params);
                const response = yield this._serviceService.getProviderServices(providerId);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                next(error);
            }
        });
        this.getServiceById = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = service_validation_1.serviceIdParamSchema.parse(req.params);
                const response = yield this._serviceService.getServiceById(id);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                next(error);
            }
        });
        this.updateService = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = service_validation_1.serviceIdParamSchema.parse(req.params);
                const validatedBody = service_validation_1.updateServiceSchema.parse(req.body);
                const serviceToUpdate = Object.assign(Object.assign({}, validatedBody), { userId: req.user.id });
                const response = yield this._serviceService.updateService(id, serviceToUpdate);
                res.status(200).json(response);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                next(error);
            }
        });
        this.deleteService = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = service_validation_1.serviceIdParamSchema.parse(req.params);
                const response = yield this._serviceService.deleteService(id);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                next(error);
            }
        });
        this._serviceService = serviceService;
    }
};
exports.ServiceController = ServiceController;
exports.ServiceController = ServiceController = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.ServiceService)),
    __metadata("design:paramtypes", [Object])
], ServiceController);
