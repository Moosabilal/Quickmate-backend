"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.ProviderService = void 0;
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../../di/type"));
const mongoose_1 = __importStar(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const HttpStatusCode_1 = require("../../enums/HttpStatusCode");
const ErrorMessage_1 = require("../../enums/ErrorMessage");
const CustomError_1 = require("../../utils/CustomError");
const otpGenerator_1 = require("../../utils/otpGenerator");
const emailService_1 = require("../../utils/emailService");
const userRoles_1 = require("../../enums/userRoles");
const provider_mapper_1 = require("../../utils/mappers/provider.mapper");
const user_mapper_1 = require("../../utils/mappers/user.mapper");
const provider_enum_1 = require("../../enums/provider.enum");
const convertTo24hrs_1 = require("../../utils/helperFunctions/convertTo24hrs");
const endOfMonth_1 = require("date-fns/endOfMonth");
const endOfWeek_1 = require("date-fns/endOfWeek");
const startOfMonth_1 = require("date-fns/startOfMonth");
const startOfWeek_1 = require("date-fns/startOfWeek");
const sub_1 = require("date-fns/sub");
const haversineKm_1 = require("../../utils/helperFunctions/haversineKm");
const format_1 = require("date-fns/format");
const review_enum_1 = require("../../enums/review.enum");
const booking_enum_1 = require("../../enums/booking.enum");
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5;
const MAX_OTP_ATTEMPTS = parseInt(process.env.MAX_OTP_ATTEMPTS, 10) || 5;
const RESEND_COOLDOWN_SECONDS = parseInt(process.env.RESEND_COOLDOWN_SECONDS, 10) || 30;
let ProviderService = class ProviderService {
    constructor(providerRepository, serviceRepository, userRepository, categoryRepository, bookingRepository, messageRepository, reviewRepository, paymentRepository, subscriptionPlanRepository) {
        this._providerRepository = providerRepository;
        this._serviceRepository = serviceRepository;
        this._userRepository = userRepository;
        this._categoryRepository = categoryRepository;
        this._bookingRepository = bookingRepository;
        this._messageRepository = messageRepository;
        this._reviewRepository = reviewRepository;
        this._paymentRepository = paymentRepository;
        this._subscriptionPlanRepository = subscriptionPlanRepository;
    }
    registerProvider(data) {
        return __awaiter(this, void 0, void 0, function* () {
            let provider = yield this._providerRepository.findByEmail(data.email);
            if (provider && provider.isVerified && provider.status !== provider_enum_1.ProviderStatus.REJECTED) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.USER_ALREADY_EXISTS, HttpStatusCode_1.HttpStatusCode.CONFLICT);
            }
            if (!provider) {
                provider = yield this._providerRepository.createProvider(data);
            }
            else if (provider && provider.status === provider_enum_1.ProviderStatus.REJECTED) {
                provider = yield this._providerRepository.updateProvider(data);
            }
            else {
                provider.fullName = data.fullName;
                provider.phoneNumber = data.phoneNumber;
                provider.isVerified = false;
            }
            const otp = (0, otpGenerator_1.generateOTP)();
            provider.registrationOtp = otp;
            provider.registrationOtpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
            provider.registrationOtpAttempts = 0;
            yield this._providerRepository.update(provider.id, provider);
            yield (0, emailService_1.sendVerificationEmail)(provider.email, otp);
            return {
                message: 'Registration successful! An OTP has been sent to your email for verification.',
                email: String(provider.email),
            };
        });
    }
    verifyOtp(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, otp } = data;
            const provider = yield this._providerRepository.findByEmail(email, true);
            if (!provider) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.USER_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            if (provider.isVerified) {
                throw new CustomError_1.CustomError('Account already verified.', HttpStatusCode_1.HttpStatusCode.CONFLICT);
            }
            if (typeof provider.registrationOtpAttempts === 'number' && provider.registrationOtpAttempts >= MAX_OTP_ATTEMPTS) {
                throw new CustomError_1.CustomError(`Too many failed OTP attempts. Please request a new OTP.`, HttpStatusCode_1.HttpStatusCode.FORBIDDEN);
            }
            if (!provider.registrationOtp || provider.registrationOtp !== otp) {
                yield this._providerRepository.update(provider.id, { $inc: { registrationOtpAttempts: 1 } });
                throw new CustomError_1.CustomError('Invalid OTP. Please try again.', HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            if (!provider.registrationOtpExpires || new Date() > provider.registrationOtpExpires) {
                throw new CustomError_1.CustomError('OTP has expired. Please request a new one.', HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            try {
                const providerUpdatePayload = {
                    isVerified: true,
                    status: provider_enum_1.ProviderStatus.PENDING,
                    registrationOtp: undefined,
                    registrationOtpExpires: undefined,
                    registrationOtpAttempts: 0,
                };
                const updatedProvider = yield this._providerRepository.update(provider.id, providerUpdatePayload, { session });
                if (!updatedProvider) {
                    throw new CustomError_1.CustomError("Failed to update provider record.", HttpStatusCode_1.HttpStatusCode.INTERNAL_SERVER_ERROR);
                }
                const userUpdatePayload = {
                    role: userRoles_1.Roles.PROVIDER
                };
                const updatedUser = yield this._userRepository.update(provider.userId.toString(), userUpdatePayload, { session });
                if (!updatedUser) {
                    throw new CustomError_1.CustomError("Failed to update user role.", HttpStatusCode_1.HttpStatusCode.INTERNAL_SERVER_ERROR);
                }
                yield session.commitTransaction();
                return {
                    provider: (0, provider_mapper_1.toProviderDTO)(updatedProvider),
                    user: (0, user_mapper_1.toLoginResponseDTO)(updatedUser)
                };
            }
            catch (error) {
                yield session.abortTransaction();
            }
            finally {
                session.endSession();
            }
        });
    }
    resendOtp(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email } = data;
            const provider = yield this._providerRepository.findByEmail(email, true);
            if (!provider) {
                return { message: 'If an account with this email exists, a new OTP has been sent.' };
            }
            if (provider.isVerified) {
                return { message: 'Account already verified. Please proceed to login.' };
            }
            if (provider.registrationOtpExpires && provider.registrationOtpExpires instanceof Date) {
                const timeSinceLastOtpSent = Date.now() - (provider.registrationOtpExpires.getTime() - (OTP_EXPIRY_MINUTES * 60 * 1000));
                if (timeSinceLastOtpSent < RESEND_COOLDOWN_SECONDS * 1000) {
                    const error = new Error(`Please wait ${RESEND_COOLDOWN_SECONDS - Math.floor(timeSinceLastOtpSent / 1000)} seconds before requesting another OTP.`);
                    error.statusCode = 429;
                    throw error;
                }
            }
            const newOtp = (0, otpGenerator_1.generateOTP)();
            provider.registrationOtp = newOtp;
            provider.registrationOtpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
            provider.registrationOtpAttempts = 0;
            yield this._providerRepository.update(provider.id, provider);
            yield (0, emailService_1.sendVerificationEmail)(email, newOtp);
            return { message: 'A new OTP has been sent to your email.' };
        });
    }
    updateProviderDetails(updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            const updatedProvider = yield this._providerRepository.updateProvider(updateData);
            if (!updatedProvider) {
                throw new CustomError_1.CustomError("Provider not found or failed to update.", HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            return (0, provider_mapper_1.toProviderDTO)(updatedProvider);
        });
    }
    getProviderWithAllDetails() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._providerRepository.getAllProviders();
        });
    }
    providersForAdmin(page, limit, search, status, rating) {
        return __awaiter(this, void 0, void 0, function* () {
            const skip = (page - 1) * limit;
            const filter = {
                $or: [
                    { fullName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                ],
            };
            if (status && status !== 'All') {
                filter.status = status;
            }
            if (rating) {
                filter.rating = { $gte: rating, $lt: rating + 1 };
            }
            const [providers, total] = yield Promise.all([
                this._providerRepository.findProvidersWithFilter(filter, skip, limit),
                this._providerRepository.countProviders(filter),
            ]);
            if (!providers || providers.length === 0) {
                throw new CustomError_1.CustomError('No providers found.', HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            const providerIds = providers.map(p => p._id);
            const services = yield this._serviceRepository.findAll({ providerId: { $in: providerIds } });
            const serviceMap = new Map();
            for (const service of services) {
                const key = service.providerId.toString();
                if (!serviceMap.has(key)) {
                    serviceMap.set(key, []);
                }
                serviceMap.get(key).push(service.title);
            }
            const data = (0, provider_mapper_1.toProviderForAdminResponseDTO)(providers, serviceMap);
            return {
                data,
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
            };
        });
    }
    getServicesForAddservice() {
        return __awaiter(this, void 0, void 0, function* () {
            const categories = yield this._categoryRepository.getAllCategories();
            const mainCategories = categories.filter(category => !category.parentId).map(category => (0, provider_mapper_1.toServiceAddPage)(category));
            const services = categories.filter(category => !!category.parentId).map(category => (0, provider_mapper_1.toServiceAddPage)(category));
            return {
                mainCategories,
                services
            };
        });
    }
    fetchProviderById(token) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!token) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.MISSING_TOKEN, HttpStatusCode_1.HttpStatusCode.UNAUTHORIZED);
            }
            let decoded;
            try {
                decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            }
            catch (error) {
                throw new CustomError_1.CustomError('Invalid or expired token.', HttpStatusCode_1.HttpStatusCode.UNAUTHORIZED);
            }
            const provider = yield this._providerRepository.getProviderByUserId(decoded.id);
            if (!provider) {
                throw new CustomError_1.CustomError("Provider profile not found for this user.", HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            return (0, provider_mapper_1.toProviderDTO)(provider);
        });
    }
    getFeaturedProviders(page, limit, search) {
        return __awaiter(this, void 0, void 0, function* () {
            const skip = (page - 1) * limit;
            const filter = {
                $or: [
                    { fullName: { $regex: search, $options: 'i' } },
                    { serviceName: { $regex: search, $options: 'i' } },
                ],
                status: provider_enum_1.ProviderStatus.ACTIVE
            };
            const providers = yield this._providerRepository.findProvidersWithFilter(filter, skip, limit);
            const total = yield this._providerRepository.countProviders(filter);
            const featuredProviders = providers.map(provider => ({
                id: provider._id.toString(),
                userId: provider.userId.toString(),
                fullName: provider.fullName,
                profilePhoto: provider.profilePhoto,
                rating: provider.rating,
            }));
            return {
                providers: featuredProviders,
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            };
        });
    }
    updateProviderStat(id, newStatus) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!newStatus) {
                throw new CustomError_1.CustomError('Status is required', HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            const allowedStatuses = Object.values(provider_enum_1.ProviderStatus);
            if (!allowedStatuses.includes(newStatus)) {
                throw new CustomError_1.CustomError(`Invalid status. Allowed: ${allowedStatuses.join(", ")}`, HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            yield this._providerRepository.updateStatusById(id, newStatus);
            return { message: "provider Status updated" };
        });
    }
    getProviderwithFilters(userId, subCategoryId, filters) {
        return __awaiter(this, void 0, void 0, function* () {
            const initialProviders = yield this._getProvidersByInitialCriteria(subCategoryId, userId, filters);
            if (initialProviders.length === 0)
                return [];
            const availableProviders = yield this._filterProvidersByBookingConflicts(initialProviders, filters);
            if (availableProviders.length === 0)
                return [];
            const enrichedProviders = yield this._enrichProvidersWithDetails(availableProviders, subCategoryId, filters);
            enrichedProviders.sort((a, b) => a.distanceKm - b.distanceKm);
            return enrichedProviders;
        });
    }
    providerForChatPage(userId, search) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!userId) {
                throw new CustomError_1.CustomError("Sorry, UserId not found", HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            const user = yield this._userRepository.findById(userId);
            if (!user) {
                throw new CustomError_1.CustomError("User not found", HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            const createJoiningId = (id1, id2) => [id1, id2].sort().join('-');
            if (user.role === userRoles_1.Roles.PROVIDER) {
                const providerProfile = yield this._providerRepository.findOne({ userId });
                if (!providerProfile)
                    return [];
                const bookings = yield this._bookingRepository.findAll({ providerId: providerProfile._id });
                if (!bookings.length)
                    return [];
                const clientIds = [...new Set(bookings.map(b => { var _a; return (_a = b.userId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean))];
                const clients = yield this._userRepository.findUsersByIdsAndSearch(clientIds, search);
                const serviceIds = bookings.map(b => { var _a; return (_a = b.serviceId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean);
                const services = yield this._serviceRepository.findAll({ _id: { $in: serviceIds } });
                const joiningIds = clients.map(client => createJoiningId(user.id, client._id.toString()));
                const messages = yield this._messageRepository.findLastMessagesByJoiningIds(joiningIds);
                return (0, provider_mapper_1.toClientForChatListPage)(user.id, bookings, clients, services, messages);
            }
            else {
                const bookings = yield this._bookingRepository.findAll({ userId });
                if (!bookings.length)
                    return [];
                const providerIds = [...new Set(bookings.map(b => { var _a; return (_a = b.providerId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean))];
                const providers = yield this._providerRepository.findProvidersByIdsAndSearch(providerIds, search);
                const serviceIds = bookings.map(b => { var _a; return (_a = b.serviceId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean);
                const services = yield this._serviceRepository.findAll({ _id: { $in: serviceIds } });
                const providerUserIds = providers.map(p => p.userId.toString());
                const joiningIds = providerUserIds.map(providerUserId => createJoiningId(user.id, providerUserId));
                const messages = yield this._messageRepository.findLastMessagesByJoiningIds(joiningIds);
                return (0, provider_mapper_1.toProviderForChatListPage)(user.id, bookings, providers, services, messages);
            }
        });
    }
    getProviderDashboard(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = yield this._providerRepository.findOne({ userId });
            if (!provider)
                throw new CustomError_1.CustomError("Provider not found", 404);
            const bookings = yield this._bookingRepository.findAll({
                providerId: provider._id.toString(),
            });
            const serviceIds = [...new Set(bookings.map((b) => { var _a; return (_a = b.serviceId) === null || _a === void 0 ? void 0 : _a.toString(); }))];
            const services = yield this._serviceRepository.findAll({
                _id: { $in: serviceIds },
            });
            const subCategoryIds = [...new Set(services.map((s) => s.subCategoryId.toString()))];
            const subCategories = yield this._categoryRepository.findAll({
                _id: { $in: subCategoryIds },
            });
            const parentCategoryIds = [...new Set(subCategories.map((sc) => sc.parentId.toString()))];
            const parentCategories = yield this._categoryRepository.findAll({
                _id: { $in: parentCategoryIds },
            });
            const reviews = yield this._reviewRepository.findAll({
                providerId: provider._id.toString(),
                status: review_enum_1.ReviewStatus.APPROVED
            });
            return (0, provider_mapper_1.toProviderDashboardDTO)(provider, bookings, services, subCategories, parentCategories, reviews);
        });
    }
    getAvailabilityByLocation(userId, serviceSubCategoryId, userLat, userLng, radiusKm, timeMin, timeMax) {
        return __awaiter(this, void 0, void 0, function* () {
            const services = yield this._serviceRepository.findAll({ subCategoryId: serviceSubCategoryId });
            const providerIdSet = new Set(services.map(s => { var _a; return (_a = s.providerId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean));
            if (providerIdSet.size === 0)
                return [];
            const providers = yield this._providerRepository.findAll({
                _id: { $in: Array.from(providerIdSet) }, userId: { $ne: userId }
            });
            const providersInRange = providers.filter(p => {
                var _a;
                const coords = (_a = p.serviceLocation) === null || _a === void 0 ? void 0 : _a.coordinates;
                if (!coords || coords.length !== 2)
                    return false;
                const [provLng, provLat] = coords;
                return (0, haversineKm_1._haversineKm)(userLat, userLng, provLat, provLng) <= radiusKm;
            });
            const startISO = new Date(timeMin);
            const endISO = new Date(timeMax);
            const results = [];
            for (const provider of providersInRange) {
                const providerId = provider._id.toString();
                const providerName = provider.fullName;
                const availableSlots = [];
                const existingBookings = yield this._bookingRepository.findByProviderByTime(providerId, timeMin.split('T')[0], timeMax.split('T')[0]);
                for (let d = new Date(startISO); d <= endISO; d.setDate(d.getDate() + 1)) {
                    const dateStr = (0, format_1.format)(d, 'yyyy-MM-dd');
                    const dayName = (0, format_1.format)(d, 'EEEE');
                    if (this._isProviderOnLeave(provider, dateStr)) {
                        continue;
                    }
                    const override = this._getDateOverride(provider, dateStr);
                    if (override === null || override === void 0 ? void 0 : override.isUnavailable) {
                        continue;
                    }
                    const weeklySlots = this._getWeeklySlots(provider, dayName);
                    if (weeklySlots.length === 0) {
                        continue;
                    }
                    const busySlots = override ? override.busySlots : [];
                    const slotMinutes = 60;
                    const slotMs = slotMinutes * 60 * 1000;
                    for (const timeSlot of weeklySlots) {
                        const [sh, sm] = String(timeSlot.start).split(':').map(Number);
                        const [eh, em] = String(timeSlot.end).split(':').map(Number);
                        const dayStart = new Date(d);
                        dayStart.setHours(sh || 0, sm || 0, 0, 0);
                        const dayEnd = new Date(d);
                        dayEnd.setHours(eh || 0, em || 0, 0, 0);
                        for (let slotStart = new Date(dayStart); slotStart.getTime() + slotMs <= dayEnd.getTime(); slotStart = new Date(slotStart.getTime() + slotMs)) {
                            const slotEnd = new Date(slotStart.getTime() + slotMs);
                            const isAvailable = this._isSlotAvailable(slotStart, slotEnd, existingBookings, busySlots);
                            if (isAvailable) {
                                availableSlots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
                            }
                        }
                    }
                }
                results.push({ providerId, providerName, availableSlots });
            }
            return results;
        });
    }
    getEarningsAnalytics(userId, period) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = yield this._providerRepository.findOne({ userId });
            if (!provider) {
                throw new CustomError_1.CustomError("Provider profile not found", HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            const providerId = provider._id.toString();
            const now = new Date();
            let currentStartDate, currentEndDate, prevStartDate, prevEndDate;
            if (period === 'week') {
                currentStartDate = (0, startOfWeek_1.startOfWeek)(now, { weekStartsOn: 1 });
                currentEndDate = (0, endOfWeek_1.endOfWeek)(now, { weekStartsOn: 1 });
                prevStartDate = (0, startOfWeek_1.startOfWeek)((0, sub_1.sub)(now, { weeks: 1 }), { weekStartsOn: 1 });
                prevEndDate = (0, endOfWeek_1.endOfWeek)((0, sub_1.sub)(now, { weeks: 1 }), { weekStartsOn: 1 });
            }
            else {
                currentStartDate = (0, startOfMonth_1.startOfMonth)(now);
                currentEndDate = (0, endOfMonth_1.endOfMonth)(now);
                prevStartDate = (0, startOfMonth_1.startOfMonth)((0, sub_1.sub)(now, { months: 1 }));
                prevEndDate = (0, endOfMonth_1.endOfMonth)((0, sub_1.sub)(now, { months: 1 }));
            }
            const [currentBookings, prevBookings] = yield Promise.all([
                this._bookingRepository.findByProviderAndDateRangeForEarnings(providerId, currentStartDate, currentEndDate),
                this._bookingRepository.findByProviderAndDateRangeForEarnings(providerId, prevStartDate, prevEndDate)
            ]);
            const totalEarnings = currentBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
            const prevTotalEarnings = prevBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
            const earningsChangePercentage = prevTotalEarnings > 0
                ? ((totalEarnings - prevTotalEarnings) / prevTotalEarnings) * 100
                : totalEarnings > 0 ? 100 : 0;
            const currentClients = [...new Set(currentBookings.map(b => b.userId._id.toString()))];
            const totalClients = currentClients.length;
            let newClients = 0;
            for (const userId of currentClients) {
                const hadPriorBooking = yield this._bookingRepository.hasPriorBooking(userId, providerId, currentStartDate);
                if (!hadPriorBooking)
                    newClients++;
            }
            const serviceEarnings = {};
            currentBookings.forEach(b => {
                var _a;
                const serviceName = ((_a = b.serviceId) === null || _a === void 0 ? void 0 : _a.title) || 'Unknown Service';
                serviceEarnings[serviceName] = (serviceEarnings[serviceName] || 0) + (Number(b.amount) || 0);
            });
            const topServiceEntry = Object.entries(serviceEarnings).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];
            const topService = { name: topServiceEntry[0], earnings: topServiceEntry[1] };
            return (0, provider_mapper_1.toEarningsAnalyticsDTO)(totalEarnings, earningsChangePercentage, totalClients, newClients, topService, currentBookings);
        });
    }
    getProviderPerformance(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const providerId = yield this._providerRepository.getProviderId(userId);
            const provider = yield this._providerRepository.findById(providerId);
            if (!provider) {
                throw new CustomError_1.CustomError("Provider not found", HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            const [bookings, reviewsFromDb, activeServicesCount, serviceBreakdown] = yield Promise.all([
                this._bookingRepository.findAll({ providerId }),
                this._reviewRepository.findAll({ providerId }),
                this._serviceRepository.findServiceCount(providerId),
                this._bookingRepository.getBookingStatsByService(providerId)
            ]);
            const userIds = reviewsFromDb.map(r => { var _a; return (_a = r.userId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(id => id);
            const users = yield this._userRepository.findAll({ _id: { $in: userIds } });
            return (0, provider_mapper_1.toProviderPerformanceDTO)(provider, bookings, reviewsFromDb, users, activeServicesCount, serviceBreakdown);
        });
    }
    getAvailability(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = yield this._providerRepository.findOne({ userId: userId });
            if (!provider) {
                throw new CustomError_1.CustomError("Provider not found", HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            return provider.availability;
        });
    }
    updateAvailability(userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = yield this._providerRepository.findOne({ userId: userId });
            if (!provider) {
                throw new CustomError_1.CustomError("Provider not found", HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            for (const period of data.leavePeriods) {
                const fromDate = new Date(period.from);
                if (fromDate < today) {
                    throw new CustomError_1.CustomError(`Leave 'from' date (${period.from}) cannot be in the past.`, HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
                }
                const toDate = new Date(period.to);
                if (toDate < fromDate) {
                    throw new CustomError_1.CustomError(`Leave 'to' date (${period.to}) cannot be before 'from' date (${period.from}).`, HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
                }
            }
            for (const override of data.dateOverrides) {
                const overrideDate = new Date(override.date);
                if (overrideDate < today) {
                    throw new CustomError_1.CustomError(`Date override (${override.date}) cannot be in the past.`, HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
                }
            }
            for (const day of data.weeklySchedule) {
                if (day.slots.length > 1) {
                    const sortedSlots = [...day.slots].sort((a, b) => a.start.localeCompare(b.start));
                    for (let i = 0; i < sortedSlots.length - 1; i++) {
                        const currentSlot = sortedSlots[i];
                        const nextSlot = sortedSlots[i + 1];
                        if (nextSlot.start < currentSlot.end) {
                            throw new CustomError_1.CustomError(`Overlapping time slots detected for ${day.day}: [${currentSlot.start}-${currentSlot.end}] and [${nextSlot.start}-${nextSlot.end}].`, HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
                        }
                    }
                }
            }
            const updatedProvider = yield this._providerRepository.update(provider._id.toString(), {
                availability: data
            });
            if (!updatedProvider) {
                throw new CustomError_1.CustomError("Failed to update availability", HttpStatusCode_1.HttpStatusCode.INTERNAL_SERVER_ERROR);
            }
            return updatedProvider.availability;
        });
    }
    _getProvidersByInitialCriteria(subCategoryId, userIdToExclude, filters) {
        return __awaiter(this, void 0, void 0, function* () {
            const services = yield this._serviceRepository.findServicesByCriteria({
                subCategoryId,
                minExperience: filters.experience,
                maxPrice: filters.price,
            });
            if (!services.length)
                return [];
            const providerIdsFromServices = [...new Set(services.map(s => s.providerId.toString()))];
            const time24h = filters.time ? (0, convertTo24hrs_1.convertTo24Hour)(filters.time) : undefined;
            const filteredProviders = yield this._providerRepository.findFilteredProviders({
                providerIds: providerIdsFromServices,
                userIdToExclude,
                lat: filters.lat,
                long: filters.long,
                radius: filters.radius,
                date: filters.date,
                time: time24h,
            });
            return filteredProviders;
        });
    }
    _filterProvidersByBookingConflicts(potentialProviders, filters) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!filters.date || !filters.time) {
                return potentialProviders;
            }
            const potentialProviderIds = potentialProviders.map(p => p._id.toString());
            const allBookingsForDay = yield this._bookingRepository.findByProviderAndDateRange(potentialProviderIds, filters.date, filters.date);
            if (!allBookingsForDay.length)
                return potentialProviders;
            const busyProviderIds = new Set();
            const time24h = (0, convertTo24hrs_1.convertTo24Hour)(filters.time);
            const [searchHours, searchMinutes] = time24h.split(':').map(Number);
            const searchSlotStart = new Date(filters.date);
            searchSlotStart.setHours(searchHours, searchMinutes, 0, 0);
            const searchSlotEnd = new Date(searchSlotStart.getTime() + 60 * 60 * 1000);
            allBookingsForDay.forEach(booking => {
                const bookingTime24h = (0, convertTo24hrs_1.convertTo24Hour)(booking.scheduledTime);
                const [bookHours, bookMinutes] = bookingTime24h.split(':').map(Number);
                const bookingStart = new Date(booking.scheduledDate);
                bookingStart.setHours(bookHours, bookMinutes, 0, 0);
                const bookingEnd = new Date(bookingStart.getTime() + (booking.duration || 60) * 60 * 1000);
                if (searchSlotStart < bookingEnd && searchSlotEnd > bookingStart) {
                    busyProviderIds.add(booking.providerId.toString());
                }
            });
            if (busyProviderIds.size === 0)
                return potentialProviders;
            return potentialProviders.filter(provider => !busyProviderIds.has(provider._id.toString()));
        });
    }
    _enrichProvidersWithDetails(availableProviders, subCategoryId, filters) {
        return __awaiter(this, void 0, void 0, function* () {
            const finalProviderIds = availableProviders.map(p => p._id.toString());
            const [reviews, services] = yield Promise.all([
                this._reviewRepository.findReviewsByProviderIds(finalProviderIds),
                this._serviceRepository.findAll({ providerId: { $in: finalProviderIds } })
            ]);
            const userIdsForReviews = [...new Set(reviews.map(r => r.userId.toString()))];
            const users = userIdsForReviews.length > 0 ? yield this._userRepository.findUsersByIds(userIdsForReviews) : [];
            const userMap = new Map(users.map(u => [u._id.toString(), { name: u.name, profilePicture: u.profilePicture || "" }]));
            const reviewsByProvider = new Map();
            reviews.forEach(review => {
                const pid = review.providerId.toString();
                if (!reviewsByProvider.has(pid))
                    reviewsByProvider.set(pid, []);
                const userData = userMap.get(review.userId.toString());
                reviewsByProvider.get(pid).push({
                    userName: (userData === null || userData === void 0 ? void 0 : userData.name) || "Anonymous",
                    userImg: (userData === null || userData === void 0 ? void 0 : userData.profilePicture) || "",
                    rating: review.rating,
                    review: review.reviewText || "",
                });
            });
            return availableProviders.map(provider => (0, provider_mapper_1.toBackendProviderDTO)(provider, services, reviewsByProvider.get(provider._id.toString()) || [], subCategoryId, filters.lat, filters.long));
        });
    }
    _isProviderOnLeave(provider, dateStr) {
        const date = new Date(dateStr.replace(/-/g, '/'));
        return provider.availability.leavePeriods.some(period => {
            const from = new Date(period.from.replace(/-/g, '/'));
            const to = new Date(period.to.replace(/-/g, '/'));
            return date >= from && date <= to;
        });
    }
    _getDateOverride(provider, dateStr) {
        return provider.availability.dateOverrides.find(o => o.date === dateStr);
    }
    _getWeeklySlots(provider, dayName) {
        const daySchedule = provider.availability.weeklySchedule.find(d => d.day === dayName);
        return (daySchedule && daySchedule.active) ? daySchedule.slots : [];
    }
    _isSlotAvailable(slotStart, slotEnd, existingBookings, busySlots) {
        const bookingConflict = existingBookings.some(booking => {
            const bookingTime24h = (0, convertTo24hrs_1.convertTo24Hour)(booking.scheduledTime);
            const [hours, minutes] = bookingTime24h.split(':').map(Number);
            const bookingStart = new Date(booking.scheduledDate);
            bookingStart.setHours(hours, minutes, 0, 0);
            const durationMs = (booking.duration || 60) * 60 * 1000;
            const bookingEnd = new Date(bookingStart.getTime() + durationMs);
            return slotStart < bookingEnd && slotEnd > bookingStart;
        });
        if (bookingConflict)
            return false;
        const busySlotConflict = busySlots.some(busySlot => {
            const [sh, sm] = busySlot.start.split(':').map(Number);
            const [eh, em] = busySlot.end.split(':').map(Number);
            const busyStart = new Date(slotStart);
            busyStart.setHours(sh, sm, 0, 0);
            const busyEnd = new Date(slotStart);
            busyEnd.setHours(eh, em, 0, 0);
            return slotStart < busyEnd && slotEnd > busyStart;
        });
        if (busySlotConflict)
            return false;
        return true;
    }
    getPublicProviderDetails(providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = yield this._providerRepository.findById(providerId);
            if (!provider) {
                throw new CustomError_1.CustomError("Provider not found", HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            const services = yield this._serviceRepository.findPopulatedByProviderId(providerId);
            const providerProfile = (0, provider_mapper_1.toProviderDTO)(provider);
            const serviceDetails = services.map(provider_mapper_1.toServiceDetailsDTO);
            return {
                provider: providerProfile,
                services: serviceDetails
            };
        });
    }
    findProvidersAvailableAtSlot(providerIds, date, time) {
        return __awaiter(this, void 0, void 0, function* () {
            const time24h = (0, convertTo24hrs_1.convertTo24Hour)(time);
            const [hour, minute] = time24h.split(':').map(Number);
            const slotStart = new Date(date);
            slotStart.setHours(hour, minute, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
            const providers = yield this._providerRepository.findAll({ _id: { $in: providerIds } });
            const availableProviders = [];
            for (const provider of providers) {
                const providerId = provider._id.toString();
                const existingBookings = yield this._bookingRepository.findByProviderByTime(providerId, date, date);
                const dayName = (0, format_1.format)(new Date(date), 'EEEE');
                const weeklySlots = this._getWeeklySlots(provider, dayName);
                const override = this._getDateOverride(provider, date);
                const busySlots = override ? override.busySlots : [];
                const isAvailable = this._isSlotAvailable(slotStart, slotEnd, existingBookings, busySlots);
                if (isAvailable) {
                    availableProviders.push(provider);
                }
            }
            return availableProviders;
        });
    }
    findNearbyProviders(coordinates_1) {
        return __awaiter(this, arguments, void 0, function* (coordinates, radiusInKm = 10, subCategoryId) {
            try {
                const services = yield this._serviceRepository.findAll({
                    subCategoryId: new mongoose_1.Types.ObjectId(subCategoryId),
                    status: true
                });
                if (!services.length) {
                    return [];
                }
                const providerIds = [...new Set(services.map(s => s.providerId.toString()))];
                const radiusInMeters = radiusInKm * 1000;
                const providers = yield this._providerRepository.findAll({
                    _id: { $in: providerIds.map(id => new mongoose_1.Types.ObjectId(id)) },
                    status: provider_enum_1.ProviderStatus.ACTIVE,
                    isVerified: true,
                    serviceLocation: {
                        $near: {
                            $geometry: {
                                type: 'Point',
                                coordinates: coordinates
                            },
                            $maxDistance: radiusInMeters
                        }
                    }
                });
                return providers;
            }
            catch (error) {
                console.error('Error finding nearby providers:', error);
                return [];
            }
        });
    }
    getProviderFullDetails(providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const provider = yield this._providerRepository.findById(providerId);
            if (!provider)
                throw new CustomError_1.CustomError("Provider not found", HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            const providerProfile = (0, provider_mapper_1.toProviderDTO)(provider);
            const [services, bookings, payments] = yield Promise.all([
                this._serviceRepository.findAll({ providerId: provider._id }),
                this._bookingRepository.findAll({ providerId: provider._id }, { createdAt: -1 }),
                this._paymentRepository.findAll({ providerId: provider._id }, { createdAt: -1 })
            ]);
            let currentPlan = null;
            if ((_a = provider.subscription) === null || _a === void 0 ? void 0 : _a.planId) {
                currentPlan = yield this._subscriptionPlanRepository.findById(provider.subscription.planId.toString());
            }
            const stats = {
                totalEarnings: provider.earnings,
                totalBookings: bookings.length,
                completedBookings: bookings.filter(b => b.status === booking_enum_1.BookingStatus.COMPLETED).length,
                cancelledBookings: bookings.filter(b => b.status === booking_enum_1.BookingStatus.CANCELLED).length,
                averageRating: provider.rating
            };
            return {
                profile: providerProfile,
                services: services,
                bookings: bookings.slice(0, 10),
                payments: payments.slice(0, 10),
                currentPlan: currentPlan,
                stats
            };
        });
    }
};
exports.ProviderService = ProviderService;
exports.ProviderService = ProviderService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.ProviderRepository)),
    __param(1, (0, inversify_1.inject)(type_1.default.ServiceRepository)),
    __param(2, (0, inversify_1.inject)(type_1.default.UserRepository)),
    __param(3, (0, inversify_1.inject)(type_1.default.CategoryRepository)),
    __param(4, (0, inversify_1.inject)(type_1.default.BookingRepository)),
    __param(5, (0, inversify_1.inject)(type_1.default.MessageRepository)),
    __param(6, (0, inversify_1.inject)(type_1.default.ReviewRepository)),
    __param(7, (0, inversify_1.inject)(type_1.default.PaymentRepository)),
    __param(8, (0, inversify_1.inject)(type_1.default.SubscriptionPlanRepository)),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object, Object, Object, Object, Object])
], ProviderService);
