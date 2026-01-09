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
import {} from "express";
import {} from "../services/interface/IProviderService.js";
import TYPES from "../di/type.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";
import {} from "../interface/provider.js";
import {} from "../middleware/authMiddleware.js";
import { HttpStatusCode } from "../enums/HttpStatusCode.js";
import {} from "../interface/auth.js";
import { ZodError } from "zod";
import { registerProviderSchema, updateProviderSchema, providersForAdminQuerySchema, updateProviderStatusSchema, paramIdSchema, getServiceProviderQuerySchema, getAvailabilityQuerySchema, getEarningsQuerySchema, featuredProvidersQuerySchema, updateAvailabilitySchema, searchQuerySchema, } from "../utils/validations/provider.validation.js";
import { verifyOtpSchema, emailOnlySchema } from "../utils/validations/auth.validation.js";
let ProviderController = class ProviderController {
    _providerService;
    constructor(providerService) {
        this._providerService = providerService;
    }
    register = async (req, res, next) => {
        try {
            const validatedBody = registerProviderSchema.parse(req.body);
            const files = req.files;
            const aadhaar = files?.aadhaarIdProof?.[0];
            const profile = files?.profilePhoto?.[0];
            const aadhaarUrl = aadhaar ? await uploadToCloudinary(aadhaar.path) : "";
            const profileUrl = profile ? await uploadToCloudinary(profile.path) : "";
            const [lat, lon] = validatedBody.serviceLocation.split(",").map(Number);
            const formData = {
                ...validatedBody,
                aadhaarIdProof: aadhaarUrl,
                profilePhoto: profileUrl,
                userId: req.user?.id,
                serviceLocation: { type: "Point", coordinates: [lon, lat] },
            };
            const response = await this._providerService.registerProvider(formData);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    verifyOtp = async (req, res, next) => {
        try {
            const validatedBody = verifyOtpSchema.parse(req.body);
            const response = await this._providerService.verifyOtp(validatedBody);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    resendOtp = async (req, res, next) => {
        try {
            const validatedBody = emailOnlySchema.parse(req.body);
            const response = await this._providerService.resendOtp(validatedBody);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    updateProvider = async (req, res, next) => {
        try {
            const validatedBody = updateProviderSchema.parse(req.body);
            const files = req.files;
            const aadhaar = files?.aadhaarIdProof?.[0];
            const profile = files?.profilePhoto?.[0];
            const aadhaarUrl = aadhaar ? await uploadToCloudinary(aadhaar.path) : undefined;
            const profileUrl = profile ? await uploadToCloudinary(profile.path) : undefined;
            let lat;
            let lon;
            if (validatedBody.serviceLocation) {
                [lat, lon] = validatedBody.serviceLocation.split(",").map(Number);
            }
            const updateData = {
                ...validatedBody,
                userId: req.user.id,
                serviceLocation: { type: "Point", coordinates: [lon, lat] },
            };
            if (lat !== undefined && lon !== undefined && !isNaN(lat) && !isNaN(lon)) {
                updateData.serviceLocation = { type: "Point", coordinates: [lon, lat] };
            }
            else {
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
        }
        catch (error) {
            if (error instanceof ZodError)
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error);
        }
    };
    getAllProvidersList = async (req, res, next) => {
        try {
            const providerWithDetails = await this._providerService.getProviderWithAllDetails();
            res.status(HttpStatusCode.OK).json(providerWithDetails);
        }
        catch (error) {
            next(error);
        }
    };
    getProvider = async (req, res, next) => {
        try {
            const token = req.cookies.token;
            const provider = await this._providerService.fetchProviderById(token);
            res.status(HttpStatusCode.OK).json(provider);
        }
        catch (error) {
            next(error);
        }
    };
    getServicesForAddPage = async (req, res, next) => {
        try {
            const response = await this._providerService.getServicesForAddservice();
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    getProvidersforAdmin = async (req, res, next) => {
        try {
            const { page, limit, search, status, rating } = providersForAdminQuerySchema.parse(req.query);
            const providersDetails = await this._providerService.providersForAdmin(page, limit, search, status, rating);
            res.status(HttpStatusCode.OK).json(providersDetails);
        }
        catch (error) {
            next(error);
        }
    };
    featuredProviders = async (req, res, next) => {
        try {
            const { page = 1, limit = 10, search = "" } = featuredProvidersQuerySchema.parse(req.query);
            const getFeaturedProviders = await this._providerService.getFeaturedProviders(page, limit, search);
            res.status(HttpStatusCode.OK).json(getFeaturedProviders);
        }
        catch (error) {
            if (error instanceof ZodError)
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error);
        }
    };
    updateProviderStatus = async (req, res, next) => {
        try {
            const { id } = paramIdSchema.parse(req.params);
            const { newStatus, reason } = updateProviderStatusSchema.parse(req.body);
            const response = await this._providerService.updateProviderStat(id, newStatus, reason);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    getServiceProvider = async (req, res, next) => {
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
                price: validatedQuery.price,
            };
            const response = await this._providerService.getProviderwithFilters(userId, validatedQuery.serviceId, filtersForService);
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    getProviderForChatPage = async (req, res, next) => {
        try {
            const { search } = searchQuerySchema.parse(req.query);
            const userId = req.user.id;
            const response = await this._providerService.providerForChatPage(userId, search);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    getProviderDashboard = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const response = await this._providerService.getProviderDashboard(userId);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    getProviderAvailability = async (req, res, next) => {
        try {
            const query = getAvailabilityQuerySchema.parse(req.query);
            const userId = req.user.id;
            const response = await this._providerService.getAvailabilityByLocation(userId, query.serviceId, query.latitude, query.longitude, query.radius ?? 10, query.timeMin, query.timeMax);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    getEarningsAnalytics = async (req, res, next) => {
        try {
            const { period } = getEarningsQuerySchema.parse(req.query);
            const userId = req.user.id;
            const analyticsData = await this._providerService.getEarningsAnalytics(userId, period);
            res.status(HttpStatusCode.OK).json({ success: true, data: analyticsData });
        }
        catch (error) {
            next(error);
        }
    };
    getPerformance = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const performanceData = await this._providerService.getProviderPerformance(userId);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: "Provider performance fetched successfully",
                data: performanceData,
            });
        }
        catch (error) {
            next(error);
        }
    };
    getAvailability = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const availability = await this._providerService.getAvailability(userId);
            res.status(HttpStatusCode.OK).json({ success: true, data: availability });
        }
        catch (error) {
            next(error);
        }
    };
    updateAvailability = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const data = updateAvailabilitySchema.parse(req.body);
            const availability = await this._providerService.updateAvailability(userId, data);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: "Availability updated successfully",
                data: availability,
            });
        }
        catch (error) {
            if (error instanceof ZodError)
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error);
        }
    };
    getPublicProviderDetails = async (req, res, next) => {
        try {
            const { providerId } = req.params;
            const response = await this._providerService.getPublicProviderDetails(providerId);
            res.status(HttpStatusCode.OK).json({ success: true, data: response });
        }
        catch (error) {
            if (error instanceof ZodError)
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error);
        }
    };
    getProviderFullDetails = async (req, res, next) => {
        try {
            const { id } = paramIdSchema.parse(req.params);
            const data = await this._providerService.getProviderFullDetails(id);
            res.status(HttpStatusCode.OK).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    };
};
ProviderController = __decorate([
    injectable(),
    __param(0, inject(TYPES.ProviderService)),
    __metadata("design:paramtypes", [Object])
], ProviderController);
export { ProviderController };
