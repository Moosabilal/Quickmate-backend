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
exports.ProviderController = void 0;
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../di/type"));
const cloudinaryUpload_1 = require("../utils/cloudinaryUpload");
const HttpStatusCode_1 = require("../enums/HttpStatusCode");
const zod_1 = require("zod");
const provider_validation_1 = require("../utils/validations/provider.validation");
const auth_validation_1 = require("../utils/validations/auth.validation");
let ProviderController = class ProviderController {
    constructor(providerService) {
        this.register = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const validatedBody = provider_validation_1.registerProviderSchema.parse(req.body);
                const files = req.files;
                const aadhaar = (_a = files === null || files === void 0 ? void 0 : files.aadhaarIdProof) === null || _a === void 0 ? void 0 : _a[0];
                const profile = (_b = files === null || files === void 0 ? void 0 : files.profilePhoto) === null || _b === void 0 ? void 0 : _b[0];
                const aadhaarUrl = aadhaar ? (yield (0, cloudinaryUpload_1.uploadToCloudinary)(aadhaar.path)) : '';
                const profileUrl = profile ? (yield (0, cloudinaryUpload_1.uploadToCloudinary)(profile.path)) : '';
                const [lat, lon] = validatedBody.serviceLocation.split(",").map(Number);
                const formData = Object.assign(Object.assign({}, validatedBody), { aadhaarIdProof: aadhaarUrl, profilePhoto: profileUrl, userId: (_c = req.user) === null || _c === void 0 ? void 0 : _c.id, serviceLocation: { type: "Point", coordinates: [lon, lat] } });
                const response = yield this._providerService.registerProvider(formData);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.verifyOtp = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const validatedBody = auth_validation_1.verifyOtpSchema.parse(req.body);
                const response = yield this._providerService.verifyOtp(validatedBody);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.resendOtp = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const validatedBody = auth_validation_1.emailOnlySchema.parse(req.body);
                const response = yield this._providerService.resendOtp(validatedBody);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.updateProvider = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const validatedBody = provider_validation_1.updateProviderSchema.parse(req.body);
                const files = req.files;
                const aadhaar = (_a = files === null || files === void 0 ? void 0 : files.aadhaarIdProof) === null || _a === void 0 ? void 0 : _a[0];
                const profile = (_b = files === null || files === void 0 ? void 0 : files.profilePhoto) === null || _b === void 0 ? void 0 : _b[0];
                const aadhaarUrl = aadhaar
                    ? (yield (0, cloudinaryUpload_1.uploadToCloudinary)(aadhaar.path)) : undefined;
                const profileUrl = profile
                    ? (yield (0, cloudinaryUpload_1.uploadToCloudinary)(profile.path)) : undefined;
                let lat;
                let lon;
                if (validatedBody.serviceLocation) {
                    [lat, lon] = validatedBody.serviceLocation.split(",").map(Number);
                }
                const updateData = Object.assign(Object.assign({}, validatedBody), { userId: req.user.id, serviceLocation: { type: "Point", coordinates: [lon, lat] } });
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
                const updatedProvider = yield this._providerService.updateProviderDetails(updateData);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({
                    provider: updatedProvider,
                    message: "Profile updated successfully",
                });
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                next(error);
            }
        });
        this.getAllProvidersList = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const providerWithDetails = yield this._providerService.getProviderWithAllDetails();
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(providerWithDetails);
            }
            catch (error) {
                next(error);
            }
        });
        this.getProvider = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const token = req.cookies.token;
                const provider = yield this._providerService.fetchProviderById(token);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(provider);
            }
            catch (error) {
                next(error);
            }
        });
        this.getServicesForAddPage = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this._providerService.getServicesForAddservice();
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.getProvidersforAdmin = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { page, limit, search, status, rating } = provider_validation_1.providersForAdminQuerySchema.parse(req.query);
                const providersDetails = yield this._providerService.providersForAdmin(page, limit, search, status, rating);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(providersDetails);
            }
            catch (error) {
                next(error);
            }
        });
        this.featuredProviders = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = 1, limit = 10, search = '' } = provider_validation_1.featuredProvidersQuerySchema.parse(req.query);
                const getFeaturedProviders = yield this._providerService.getFeaturedProviders(page, limit, search);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(getFeaturedProviders);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                next(error);
            }
        });
        this.updateProviderStatus = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = provider_validation_1.paramIdSchema.parse(req.params);
                const { newStatus, reason } = provider_validation_1.updateProviderStatusSchema.parse(req.body);
                const response = yield this._providerService.updateProviderStat(id, newStatus, reason);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.getServiceProvider = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const validatedQuery = provider_validation_1.getServiceProviderQuerySchema.parse(req.query);
                const userId = req.user.id;
                const filtersForService = {
                    lat: validatedQuery.latitude,
                    long: validatedQuery.longitude,
                    radius: (_a = validatedQuery.radius) !== null && _a !== void 0 ? _a : 10,
                    experience: validatedQuery.experience,
                    date: validatedQuery.date,
                    time: validatedQuery.time,
                    price: validatedQuery.price
                };
                const response = yield this._providerService.getProviderwithFilters(userId, validatedQuery.serviceId, filtersForService);
                res.status(200).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.getProviderForChatPage = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { search } = provider_validation_1.searchQuerySchema.parse(req.query);
                const userId = req.user.id;
                const response = yield this._providerService.providerForChatPage(userId, search);
                console.log('the respose', response);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.getProviderDashboard = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const response = yield this._providerService.getProviderDashboard(userId);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.getProviderAvailability = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const query = provider_validation_1.getAvailabilityQuerySchema.parse(req.query);
                const userId = req.user.id;
                const response = yield this._providerService.getAvailabilityByLocation(userId, query.serviceId, query.latitude, query.longitude, (_a = query.radius) !== null && _a !== void 0 ? _a : 10, query.timeMin, query.timeMax);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.getEarningsAnalytics = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { period } = provider_validation_1.getEarningsQuerySchema.parse(req.query);
                const userId = req.user.id;
                const analyticsData = yield this._providerService.getEarningsAnalytics(userId, period);
                console.log(analyticsData);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({ success: true, data: analyticsData });
            }
            catch (error) {
                next(error);
            }
        });
        this.getPerformance = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const performanceData = yield this._providerService.getProviderPerformance(userId);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({
                    success: true,
                    message: "Provider performance fetched successfully",
                    data: performanceData
                });
            }
            catch (error) {
                next(error);
            }
        });
        this.getAvailability = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const availability = yield this._providerService.getAvailability(userId);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({ success: true, data: availability });
            }
            catch (error) {
                next(error);
            }
        });
        this.updateAvailability = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const data = provider_validation_1.updateAvailabilitySchema.parse(req.body);
                const availability = yield this._providerService.updateAvailability(userId, data);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({
                    success: true,
                    message: "Availability updated successfully",
                    data: availability
                });
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                next(error);
            }
        });
        this.getPublicProviderDetails = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { providerId } = req.params;
                const response = yield this._providerService.getPublicProviderDetails(providerId);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({ success: true, data: response });
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                next(error);
            }
        });
        this.getProviderFullDetails = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = provider_validation_1.paramIdSchema.parse(req.params);
                const data = yield this._providerService.getProviderFullDetails(id);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({ success: true, data });
            }
            catch (error) {
                next(error);
            }
        });
        this._providerService = providerService;
    }
};
exports.ProviderController = ProviderController;
exports.ProviderController = ProviderController = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.ProviderService)),
    __metadata("design:paramtypes", [Object])
], ProviderController);
