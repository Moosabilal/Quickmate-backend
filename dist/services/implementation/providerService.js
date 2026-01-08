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
import TYPES from "../../di/type";
import { Types } from "mongoose";
import jwt from "jsonwebtoken";
import { HttpStatusCode } from "../../enums/HttpStatusCode";
import { ErrorMessage } from "../../enums/ErrorMessage";
import { CustomError } from "../../utils/CustomError";
import { generateOTP } from "../../utils/otpGenerator";
import { sendProviderStatusUpdateEmail, sendVerificationEmail } from "../../utils/emailService";
import { Roles } from "../../enums/userRoles";
import { toBackendProviderDTO, toClientForChatListPage, toEarningsAnalyticsDTO, toProviderDashboardDTO, toProviderDTO, toProviderForAdminResponseDTO, toProviderForChatListPage, toProviderPerformanceDTO, toServiceAddPage, toServiceDetailsDTO, } from "../../utils/mappers/provider.mapper";
import { toLoginResponseDTO } from "../../utils/mappers/user.mapper";
import { ProviderStatus } from "../../enums/provider.enum";
import { convertTo24Hour } from "../../utils/helperFunctions/convertTo24hrs";
import { endOfMonth } from "date-fns/endOfMonth";
import { endOfWeek } from "date-fns/endOfWeek";
import { startOfMonth } from "date-fns/startOfMonth";
import { startOfWeek } from "date-fns/startOfWeek";
import { sub } from "date-fns/sub";
import { _haversineKm } from "../../utils/helperFunctions/haversineKm";
import { format } from "date-fns/format";
import { ReviewStatus } from "../../enums/review.enum";
import { BookingStatus } from "../../enums/booking.enum";
import { getSignedUrl } from "../../utils/cloudinaryUpload";
import { convertDurationToMinutes } from "../../utils/helperFunctions/convertDurationToMinutes";
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5;
const MAX_OTP_ATTEMPTS = parseInt(process.env.MAX_OTP_ATTEMPTS, 10) || 5;
const RESEND_COOLDOWN_SECONDS = parseInt(process.env.RESEND_COOLDOWN_SECONDS, 10) || 30;
let ProviderService = class ProviderService {
    _providerRepository;
    _serviceRepository;
    _userRepository;
    _categoryRepository;
    _bookingRepository;
    _messageRepository;
    _reviewRepository;
    _paymentRepository;
    _subscriptionPlanRepository;
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
    async registerProvider(data) {
        let provider = await this._providerRepository.findByEmail(data.email);
        if (provider && provider.isVerified && provider.status !== ProviderStatus.REJECTED) {
            throw new CustomError(ErrorMessage.USER_ALREADY_EXISTS, HttpStatusCode.CONFLICT);
        }
        if (!provider) {
            provider = await this._providerRepository.createProvider(data);
        }
        else if (provider && provider.status === ProviderStatus.REJECTED) {
            provider = await this._providerRepository.updateProvider(data);
        }
        else {
            provider.fullName = data.fullName;
            provider.phoneNumber = data.phoneNumber;
            provider.isVerified = false;
        }
        const otp = generateOTP();
        provider.registrationOtp = otp;
        provider.registrationOtpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        provider.registrationOtpAttempts = 0;
        await this._providerRepository.update(provider.id, provider);
        await sendVerificationEmail(provider.email, otp);
        return {
            message: "Registration successful! An OTP has been sent to your email for verification.",
            email: String(provider.email),
        };
    }
    async verifyOtp(data) {
        const { email, otp } = data;
        const provider = await this._providerRepository.findByEmail(email, true);
        if (!provider) {
            throw new CustomError(ErrorMessage.USER_NOT_FOUND, HttpStatusCode.NOT_FOUND);
        }
        if (provider.isVerified) {
            throw new CustomError("Account already verified.", HttpStatusCode.CONFLICT);
        }
        if (typeof provider.registrationOtpAttempts === "number" && provider.registrationOtpAttempts >= MAX_OTP_ATTEMPTS) {
            throw new CustomError(`Too many failed OTP attempts. Please request a new OTP.`, HttpStatusCode.FORBIDDEN);
        }
        if (!provider.registrationOtp || provider.registrationOtp !== otp) {
            await this._providerRepository.update(provider.id, {
                $inc: { registrationOtpAttempts: 1 },
            });
            throw new CustomError("Invalid OTP. Please try again.", HttpStatusCode.BAD_REQUEST);
        }
        if (!provider.registrationOtpExpires || new Date() > provider.registrationOtpExpires) {
            throw new CustomError("OTP has expired. Please request a new one.", HttpStatusCode.BAD_REQUEST);
        }
        const providerUpdatePayload = {
            isVerified: true,
            status: ProviderStatus.PENDING,
            registrationOtp: undefined,
            registrationOtpExpires: undefined,
            registrationOtpAttempts: 0,
        };
        const updatedProvider = await this._providerRepository.update(provider.id, providerUpdatePayload);
        if (!updatedProvider) {
            throw new CustomError("Failed to update provider record.", HttpStatusCode.INTERNAL_SERVER_ERROR);
        }
        const userUpdatePayload = {
            role: Roles.PROVIDER,
        };
        const updatedUser = await this._userRepository.update(provider.userId.toString(), userUpdatePayload);
        if (!updatedUser) {
            throw new CustomError("Failed to update user role.", HttpStatusCode.INTERNAL_SERVER_ERROR);
        }
        if (updatedProvider.email && updatedProvider.fullName) {
            await sendProviderStatusUpdateEmail(updatedProvider.email, updatedProvider.fullName, "Pending");
        }
        return {
            provider: toProviderDTO(updatedProvider),
            user: toLoginResponseDTO(updatedUser),
        };
    }
    async resendOtp(data) {
        const { email } = data;
        const provider = await this._providerRepository.findByEmail(email, true);
        if (!provider) {
            return {
                message: "If an account with this email exists, a new OTP has been sent.",
            };
        }
        if (provider.isVerified) {
            return { message: "Account already verified. Please proceed to login." };
        }
        if (provider.registrationOtpExpires && provider.registrationOtpExpires instanceof Date) {
            const timeSinceLastOtpSent = Date.now() - (provider.registrationOtpExpires.getTime() - OTP_EXPIRY_MINUTES * 60 * 1000);
            if (timeSinceLastOtpSent < RESEND_COOLDOWN_SECONDS * 1000) {
                const remainingCooldown = RESEND_COOLDOWN_SECONDS - Math.floor(timeSinceLastOtpSent / 1000);
                throw new CustomError(`Please wait ${remainingCooldown} seconds before requesting another OTP.`, HttpStatusCode.FORBIDDEN);
            }
        }
        const newOtp = generateOTP();
        provider.registrationOtp = newOtp;
        provider.registrationOtpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        provider.registrationOtpAttempts = 0;
        await this._providerRepository.update(provider.id, provider);
        await sendVerificationEmail(email, newOtp);
        return { message: "A new OTP has been sent to your email." };
    }
    async updateProviderDetails(updateData) {
        const updatedProvider = await this._providerRepository.updateProvider(updateData);
        if (!updatedProvider) {
            throw new CustomError("Provider not found or failed to update.", HttpStatusCode.NOT_FOUND);
        }
        return toProviderDTO(updatedProvider);
    }
    async getProviderWithAllDetails() {
        const providers = await this._providerRepository.getAllProviders();
        return providers.map((provider) => toProviderDTO(provider));
    }
    async providersForAdmin(page, limit, search, status, rating) {
        const [providers, total] = await Promise.all([
            this._providerRepository.findProvidersWithFilter({
                search,
                status,
                rating,
                page,
                limit,
            }),
            this._providerRepository.countProviders({ search, status, rating }),
        ]);
        if (!providers || providers.length === 0) {
            throw new CustomError("No providers found.", HttpStatusCode.NOT_FOUND);
        }
        const providerIds = providers.map((p) => p._id);
        const services = await this._serviceRepository.findAll({
            providerId: { $in: providerIds },
        });
        const serviceMap = new Map();
        for (const service of services) {
            const key = service.providerId.toString();
            if (!serviceMap.has(key)) {
                serviceMap.set(key, []);
            }
            serviceMap.get(key).push(service.title);
        }
        const data = toProviderForAdminResponseDTO(providers, serviceMap);
        return {
            data,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }
    async getServicesForAddservice() {
        const categories = await this._categoryRepository.getAllCategories();
        const mainCategories = categories
            .filter((category) => !category.parentId)
            .map((category) => toServiceAddPage(category));
        const services = categories.filter((category) => !!category.parentId).map((category) => toServiceAddPage(category));
        return {
            mainCategories,
            services,
        };
    }
    async fetchProviderById(token) {
        if (!token) {
            throw new CustomError(ErrorMessage.MISSING_TOKEN, HttpStatusCode.UNAUTHORIZED);
        }
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        }
        catch {
            throw new CustomError("Invalid or expired token.", HttpStatusCode.UNAUTHORIZED);
        }
        const provider = await this._providerRepository.getProviderByUserId(decoded.id);
        if (!provider) {
            throw new CustomError("Provider profile not found for this user.", HttpStatusCode.NOT_FOUND);
        }
        return toProviderDTO(provider);
    }
    async getFeaturedProviders(page, limit, search) {
        const [providers, total] = await Promise.all([
            await this._providerRepository.findProvidersWithFilter({
                search,
                status: ProviderStatus.ACTIVE,
                page,
                limit,
            }),
            await this._providerRepository.countProviders({
                search,
                status: ProviderStatus.ACTIVE,
            }),
        ]);
        const featuredProviders = providers.map((provider) => ({
            id: provider._id.toString(),
            userId: provider.userId.toString(),
            fullName: provider.fullName,
            profilePhoto: provider.profilePhoto ? getSignedUrl(provider.profilePhoto) : "",
            rating: provider.rating,
        }));
        return {
            providers: featuredProviders,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }
    async updateProviderStat(id, newStatus, reason) {
        if (!newStatus) {
            throw new CustomError("Status is required", HttpStatusCode.BAD_REQUEST);
        }
        const allowedStatuses = Object.values(ProviderStatus);
        if (!allowedStatuses.includes(newStatus)) {
            throw new CustomError(`Invalid status. Allowed: ${allowedStatuses.join(", ")}`, HttpStatusCode.BAD_REQUEST);
        }
        const provider = await this._providerRepository.findById(id);
        if (!provider) {
            throw new CustomError("Provider not found", HttpStatusCode.NOT_FOUND);
        }
        await this._providerRepository.updateStatusById(id, newStatus);
        if (provider.email && provider.fullName) {
            await sendProviderStatusUpdateEmail(provider.email, provider.fullName, newStatus, reason);
        }
        return { message: "provider Status updated" };
    }
    async getProviderwithFilters(userId, subCategoryId, filters) {
        const initialProviders = await this._getProvidersByInitialCriteria(subCategoryId, userId, filters);
        if (initialProviders.length === 0)
            return [];
        const availableProviders = await this._filterProvidersByBookingConflicts(initialProviders, filters);
        if (availableProviders.length === 0)
            return [];
        const enrichedProviders = await this._enrichProvidersWithDetails(availableProviders, subCategoryId, filters);
        enrichedProviders.sort((a, b) => a.distanceKm - b.distanceKm);
        return enrichedProviders;
    }
    async providerForChatPage(userId, search) {
        if (!userId) {
            throw new CustomError("Sorry, UserId not found", HttpStatusCode.NOT_FOUND);
        }
        const user = await this._userRepository.findById(userId);
        if (!user) {
            throw new CustomError("User not found", HttpStatusCode.NOT_FOUND);
        }
        const createJoiningId = (id1, id2) => [id1, id2].sort().join("-");
        let chatList = [];
        if (user.role === Roles.PROVIDER) {
            const providerProfile = await this._providerRepository.findOne({
                userId,
            });
            if (providerProfile) {
                const bookings = await this._bookingRepository.findAll({
                    providerId: providerProfile._id,
                });
                if (bookings.length > 0) {
                    const clientIds = [...new Set(bookings.map((b) => b.userId?.toString()).filter(Boolean))];
                    const clients = await this._userRepository.findUsersByIdsAndSearch(clientIds, search);
                    if (clients.length > 0) {
                        const serviceIds = bookings.map((b) => b.serviceId?.toString()).filter(Boolean);
                        const services = await this._serviceRepository.findAll({
                            _id: { $in: serviceIds },
                        });
                        const joiningIds = clients.map((client) => createJoiningId(user.id, client._id.toString()));
                        const messages = await this._messageRepository.findLastMessagesByJoiningIds(joiningIds);
                        const clientChats = toClientForChatListPage(user.id, bookings, clients, services, messages);
                        chatList = [...chatList, ...clientChats];
                    }
                }
            }
        }
        const bookingsAsClient = await this._bookingRepository.findAll({
            userId: new Types.ObjectId(userId),
        });
        if (bookingsAsClient.length > 0) {
            const providerIds = [...new Set(bookingsAsClient.map((b) => b.providerId?.toString()).filter(Boolean))];
            const providers = await this._providerRepository.findProvidersByIdsAndSearch(providerIds, search);
            if (providers.length > 0) {
                const serviceIds = bookingsAsClient.map((b) => b.serviceId?.toString()).filter(Boolean);
                const services = await this._serviceRepository.findAll({
                    _id: { $in: serviceIds },
                });
                const providerUserIds = providers.map((p) => p.userId.toString());
                const joiningIds = providerUserIds.map((providerUserId) => createJoiningId(user.id, providerUserId));
                const messages = await this._messageRepository.findLastMessagesByJoiningIds(joiningIds);
                const providerChats = toProviderForChatListPage(user.id, bookingsAsClient, providers, services, messages);
                chatList = [...chatList, ...providerChats];
            }
        }
        return chatList;
    }
    async getProviderDashboard(userId) {
        const provider = await this._providerRepository.findOne({ userId });
        if (!provider)
            throw new CustomError("Provider not found", 404);
        const bookings = await this._bookingRepository.findAll({
            providerId: provider._id.toString(),
        });
        const serviceIds = [...new Set(bookings.map((b) => b.serviceId?.toString()))];
        const services = await this._serviceRepository.findAll({
            _id: { $in: serviceIds },
        });
        const subCategoryIds = [...new Set(services.map((s) => s.subCategoryId.toString()))];
        const subCategories = await this._categoryRepository.findAll({
            _id: { $in: subCategoryIds },
        });
        const parentCategoryIds = [...new Set(subCategories.map((sc) => sc.parentId.toString()))];
        const parentCategories = await this._categoryRepository.findAll({
            _id: { $in: parentCategoryIds },
        });
        const reviews = await this._reviewRepository.findAll({
            providerId: provider._id.toString(),
            status: ReviewStatus.APPROVED,
        });
        return toProviderDashboardDTO(provider, bookings, services, subCategories, parentCategories, reviews);
    }
    async getAvailabilityByLocation(userId, serviceSubCategoryId, userLat, userLng, radiusKm, timeMin, timeMax) {
        const services = await this._serviceRepository.findAll({
            subCategoryId: serviceSubCategoryId,
        });
        const providerIdSet = new Set(services.map((s) => s.providerId?.toString()).filter(Boolean));
        if (providerIdSet.size === 0)
            return [];
        const providers = await this._providerRepository.findAll({
            _id: { $in: Array.from(providerIdSet) },
            userId: { $ne: userId },
        });
        const providersInRange = providers.filter((p) => {
            const coords = p.serviceLocation?.coordinates;
            if (!coords || coords.length !== 2)
                return false;
            const [provLng, provLat] = coords;
            return _haversineKm(userLat, userLng, provLat, provLng) <= radiusKm;
        });
        const startISO = new Date(timeMin);
        const endISO = new Date(timeMax);
        const results = [];
        for (const provider of providersInRange) {
            const providerId = provider._id.toString();
            const providerName = provider.fullName;
            const availableSlots = [];
            const existingBookings = await this._bookingRepository.findByProviderByTime(providerId, timeMin.split("T")[0], timeMax.split("T")[0]);
            for (let d = new Date(startISO); d <= endISO; d.setDate(d.getDate() + 1)) {
                const dateStr = format(d, "yyyy-MM-dd");
                const dayName = format(d, "EEEE");
                if (this._isProviderOnLeave(provider, dateStr)) {
                    continue;
                }
                const override = this._getDateOverride(provider, dateStr);
                if (override?.isUnavailable) {
                    continue;
                }
                const weeklySlots = this._getWeeklySlots(provider, dayName);
                if (weeklySlots.length === 0) {
                    continue;
                }
                const busySlots = override ? override.busySlots : [];
                const providerService = services.find((s) => s.providerId?.toString() === provider._id.toString());
                const durationMins = providerService ? convertDurationToMinutes(providerService.duration) : 60; // Default to 60 if not found
                const serviceDurationMs = durationMins * 60 * 1000;
                const stepMs = 60 * 60 * 1000;
                for (const timeSlot of weeklySlots) {
                    const [sh, sm] = String(timeSlot.start).split(":").map(Number);
                    const [eh, em] = String(timeSlot.end).split(":").map(Number);
                    const dayStart = new Date(d);
                    dayStart.setHours(sh || 0, sm || 0, 0, 0);
                    const dayEnd = new Date(d);
                    dayEnd.setHours(eh || 0, em || 0, 0, 0);
                    for (let slotStart = new Date(dayStart); slotStart.getTime() + serviceDurationMs <= dayEnd.getTime(); slotStart = new Date(slotStart.getTime() + stepMs)) {
                        const slotEnd = new Date(slotStart.getTime() + serviceDurationMs);
                        const isAvailable = this._isSlotAvailable(slotStart, slotEnd, existingBookings, busySlots);
                        if (isAvailable) {
                            availableSlots.push({
                                start: slotStart.toISOString(),
                                end: slotEnd.toISOString(),
                            });
                        }
                    }
                }
            }
            results.push({ providerId, providerName, availableSlots });
        }
        return results;
    }
    async getEarningsAnalytics(userId, period) {
        const provider = await this._providerRepository.findOne({ userId });
        if (!provider) {
            throw new CustomError("Provider profile not found", HttpStatusCode.NOT_FOUND);
        }
        const providerId = provider._id.toString();
        const now = new Date();
        let currentStartDate, currentEndDate, prevStartDate, prevEndDate;
        if (period === "week") {
            currentStartDate = startOfWeek(now, { weekStartsOn: 1 });
            currentEndDate = endOfWeek(now, { weekStartsOn: 1 });
            prevStartDate = startOfWeek(sub(now, { weeks: 1 }), { weekStartsOn: 1 });
            prevEndDate = endOfWeek(sub(now, { weeks: 1 }), { weekStartsOn: 1 });
        }
        else {
            currentStartDate = startOfMonth(now);
            currentEndDate = endOfMonth(now);
            prevStartDate = startOfMonth(sub(now, { months: 1 }));
            prevEndDate = endOfMonth(sub(now, { months: 1 }));
        }
        const [currentPayments, prevPayments] = await Promise.all([
            this._paymentRepository.findAll({
                providerId: providerId,
                paymentDate: { $gte: currentStartDate, $lte: currentEndDate },
            }),
            this._paymentRepository.findAll({
                providerId: providerId,
                paymentDate: { $gte: prevStartDate, $lte: prevEndDate },
            }),
        ]);
        const allBookingIds = [
            ...new Set([
                ...currentPayments.map((p) => p.bookingId.toString()),
                ...prevPayments.map((p) => p.bookingId.toString()),
            ]),
        ];
        const allBookings = await this._bookingRepository.findAll({
            _id: { $in: allBookingIds },
        });
        const bookingMap = new Map(allBookings.map((b) => [b._id.toString(), b]));
        const validCurrentPayments = currentPayments.filter((p) => bookingMap.get(p.bookingId.toString())?.status === BookingStatus.COMPLETED);
        const validPrevPayments = prevPayments.filter((p) => bookingMap.get(p.bookingId.toString())?.status === BookingStatus.COMPLETED);
        const totalEarnings = validCurrentPayments.reduce((sum, p) => sum + (Number(p.providerAmount) || 0), 0);
        const prevTotalEarnings = validPrevPayments.reduce((sum, p) => sum + (Number(p.providerAmount) || 0), 0);
        const earningsChangePercentage = prevTotalEarnings > 0
            ? ((totalEarnings - prevTotalEarnings) / prevTotalEarnings) * 100
            : totalEarnings > 0
                ? 100
                : 0;
        const currentBookings = validCurrentPayments.map((p) => bookingMap.get(p.bookingId.toString())).filter((b) => !!b);
        const serviceIds = [...new Set(currentBookings.map((b) => b?.serviceId?.toString()).filter(Boolean))];
        const services = await this._serviceRepository.findAll({
            _id: { $in: serviceIds },
        });
        const userIds = [...new Set(currentBookings.map((b) => b?.userId?.toString()).filter(Boolean))];
        const users = await this._userRepository.findAll({ _id: { $in: userIds } });
        const serviceMap = new Map(services.map((s) => [s._id.toString(), s]));
        const userMap = new Map(users.map((u) => [u._id.toString(), u]));
        const populatedData = validCurrentPayments
            .map((payment) => {
            const booking = bookingMap.get(payment.bookingId.toString());
            if (!booking)
                return null;
            const service = booking.serviceId ? serviceMap.get(booking.serviceId.toString()) : null;
            const user = booking.userId ? userMap.get(booking.userId.toString()) : null;
            return {
                updatedAt: (booking.updatedAt || booking.createdAt),
                serviceId: service ? { title: service.title } : null,
                userId: user ? { name: user.name, _id: user._id } : null,
                amount: payment.providerAmount,
                status: booking.status,
            };
        })
            .filter((item) => item !== null);
        const currentClients = [...new Set(populatedData.map((d) => d?.userId?._id.toString()).filter(Boolean))];
        const totalClients = currentClients.length;
        let newClients = 0;
        for (const clientId of currentClients) {
            const hadPriorBooking = await this._bookingRepository.hasPriorBooking(clientId, providerId, currentStartDate);
            if (!hadPriorBooking)
                newClients++;
        }
        const serviceEarnings = {};
        populatedData.forEach((b) => {
            const serviceName = b?.serviceId?.title || "Unknown Service";
            serviceEarnings[serviceName] = (serviceEarnings[serviceName] || 0) + (Number(b?.amount) || 0);
        });
        const topServiceEntry = Object.entries(serviceEarnings).sort((a, b) => b[1] - a[1])[0] || ["N/A", 0];
        const topService = {
            name: topServiceEntry[0],
            earnings: topServiceEntry[1],
        };
        return toEarningsAnalyticsDTO(totalEarnings, earningsChangePercentage, totalClients, newClients, topService, populatedData);
    }
    async getProviderPerformance(userId) {
        const providerId = await this._providerRepository.getProviderId(userId);
        const provider = await this._providerRepository.findById(providerId);
        if (!provider) {
            throw new CustomError("Provider not found", HttpStatusCode.NOT_FOUND);
        }
        const [bookings, reviewsFromDb, activeServicesCount, serviceBreakdown] = await Promise.all([
            this._bookingRepository.findAll({ providerId }),
            this._reviewRepository.findAll({ providerId }),
            this._serviceRepository.findServiceCount(providerId),
            this._bookingRepository.getBookingStatsByService(providerId),
        ]);
        const userIds = reviewsFromDb.map((r) => r.userId?.toString()).filter((id) => id);
        const users = await this._userRepository.findAll({ _id: { $in: userIds } });
        return toProviderPerformanceDTO(provider, bookings, reviewsFromDb, users, activeServicesCount, serviceBreakdown);
    }
    async getAvailability(userId) {
        const provider = await this._providerRepository.findOne({ userId: userId });
        if (!provider) {
            throw new CustomError("Provider not found", HttpStatusCode.NOT_FOUND);
        }
        return provider.availability;
    }
    async updateAvailability(userId, data) {
        const provider = await this._providerRepository.findOne({ userId: userId });
        if (!provider) {
            throw new CustomError("Provider not found", HttpStatusCode.NOT_FOUND);
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (const period of data.leavePeriods) {
            const fromDate = new Date(period.from);
            if (fromDate < today) {
                throw new CustomError(`Leave 'from' date (${period.from}) cannot be in the past.`, HttpStatusCode.BAD_REQUEST);
            }
            const toDate = new Date(period.to);
            if (toDate < fromDate) {
                throw new CustomError(`Leave 'to' date (${period.to}) cannot be before 'from' date (${period.from}).`, HttpStatusCode.BAD_REQUEST);
            }
        }
        for (const override of data.dateOverrides) {
            const overrideDate = new Date(override.date);
            if (overrideDate < today) {
                throw new CustomError(`Date override (${override.date}) cannot be in the past.`, HttpStatusCode.BAD_REQUEST);
            }
        }
        for (const day of data.weeklySchedule) {
            if (day.slots.length > 1) {
                const sortedSlots = [...day.slots].sort((a, b) => a.start.localeCompare(b.start));
                for (let i = 0; i < sortedSlots.length - 1; i++) {
                    const currentSlot = sortedSlots[i];
                    const nextSlot = sortedSlots[i + 1];
                    if (nextSlot.start < currentSlot.end) {
                        throw new CustomError(`Overlapping time slots detected for ${day.day}: [${currentSlot.start}-${currentSlot.end}] and [${nextSlot.start}-${nextSlot.end}].`, HttpStatusCode.BAD_REQUEST);
                    }
                }
            }
        }
        const updatedProvider = await this._providerRepository.update(provider._id.toString(), {
            availability: data,
        });
        if (!updatedProvider) {
            throw new CustomError("Failed to update availability", HttpStatusCode.INTERNAL_SERVER_ERROR);
        }
        return updatedProvider.availability;
    }
    async getPublicProviderDetails(providerId) {
        const provider = await this._providerRepository.findById(providerId);
        if (!provider) {
            throw new CustomError("Provider not found", HttpStatusCode.NOT_FOUND);
        }
        const services = await this._serviceRepository.findPopulatedByProviderId(providerId);
        const providerProfile = toProviderDTO(provider);
        const serviceDetails = services.map(toServiceDetailsDTO);
        return {
            provider: providerProfile,
            services: serviceDetails,
        };
    }
    async findProvidersAvailableAtSlot(providerIds, date, time) {
        const time24h = convertTo24Hour(time);
        const [hour, minute] = time24h.split(":").map(Number);
        const slotStart = new Date(date);
        slotStart.setHours(hour, minute, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
        const providers = await this._providerRepository.findAll({
            _id: { $in: providerIds },
        });
        const availableProviders = [];
        for (const provider of providers) {
            const providerId = provider._id.toString();
            const existingBookings = await this._bookingRepository.findByProviderByTime(providerId, date, date);
            const override = this._getDateOverride(provider, date);
            const busySlots = override ? override.busySlots : [];
            const isAvailable = this._isSlotAvailable(slotStart, slotEnd, existingBookings, busySlots);
            if (isAvailable) {
                availableProviders.push(provider);
            }
        }
        return availableProviders;
    }
    async findNearbyProviders(coordinates, radiusInKm = 10, subCategoryId) {
        try {
            const services = await this._serviceRepository.findAll({
                subCategoryId: new Types.ObjectId(subCategoryId),
                status: true,
            });
            if (!services.length) {
                return [];
            }
            const providerIds = [...new Set(services.map((s) => s.providerId.toString()))];
            const radiusInMeters = radiusInKm * 1000;
            const providers = await this._providerRepository.findAll({
                _id: { $in: providerIds.map((id) => new Types.ObjectId(id)) },
                status: ProviderStatus.ACTIVE,
                isVerified: true,
                serviceLocation: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: coordinates,
                        },
                        $maxDistance: radiusInMeters,
                    },
                },
            });
            return providers.map((provider) => toProviderDTO(provider));
        }
        catch (error) {
            console.error("Error finding nearby providers:", error);
            return [];
        }
    }
    async getProviderFullDetails(providerId) {
        const provider = await this._providerRepository.findById(providerId);
        if (!provider)
            throw new CustomError("Provider not found", HttpStatusCode.NOT_FOUND);
        const providerProfile = toProviderDTO(provider);
        const [services, bookings, payments] = await Promise.all([
            this._serviceRepository.findAll({ providerId: provider._id }),
            this._bookingRepository.findAll({ providerId: provider._id }, { createdAt: -1 }),
            this._paymentRepository.findAll({ providerId: provider._id }, { createdAt: -1 }),
        ]);
        let currentPlan = null;
        if (provider.subscription?.planId) {
            currentPlan = await this._subscriptionPlanRepository.findById(provider.subscription.planId.toString());
        }
        const stats = {
            totalEarnings: provider.earnings,
            totalBookings: bookings.length,
            completedBookings: bookings.filter((b) => b.status === BookingStatus.COMPLETED).length,
            cancelledBookings: bookings.filter((b) => b.status === BookingStatus.CANCELLED).length,
            averageRating: provider.rating,
        };
        const securedServices = services.map((service) => {
            const s = service.toObject ? service.toObject() : service;
            return {
                ...s,
                businessCertification: s.businessCertification ? getSignedUrl(s.businessCertification) : "",
            };
        });
        return {
            profile: providerProfile,
            services: securedServices,
            bookings: bookings.slice(0, 10),
            payments: payments.slice(0, 10),
            currentPlan: currentPlan,
            stats,
        };
    }
    //private functions
    async _getProvidersByInitialCriteria(subCategoryId, userIdToExclude, filters) {
        const services = await this._serviceRepository.findServicesByCriteria({
            subCategoryId,
            minExperience: filters.experience,
            maxPrice: filters.price,
        });
        if (!services.length)
            return [];
        const providerIdsFromServices = [...new Set(services.map((s) => s.providerId.toString()))];
        const time24h = filters.time ? convertTo24Hour(filters.time) : undefined;
        const filteredProviders = await this._providerRepository.findFilteredProviders({
            providerIds: providerIdsFromServices,
            userIdToExclude,
            lat: filters.lat,
            long: filters.long,
            radius: filters.radius,
            date: filters.date,
            time: time24h,
        });
        return filteredProviders;
    }
    async _filterProvidersByBookingConflicts(potentialProviders, filters) {
        if (!filters.date || !filters.time) {
            return potentialProviders;
        }
        const potentialProviderIds = potentialProviders.map((p) => p._id.toString());
        const allBookingsForDay = await this._bookingRepository.findByProviderAndDateRange(potentialProviderIds, filters.date, filters.date);
        if (!allBookingsForDay.length)
            return potentialProviders;
        const busyProviderIds = new Set();
        const time24h = convertTo24Hour(filters.time);
        const [searchHours, searchMinutes] = time24h.split(":").map(Number);
        const searchSlotStart = new Date(filters.date);
        searchSlotStart.setHours(searchHours, searchMinutes, 0, 0);
        const searchSlotEnd = new Date(searchSlotStart.getTime() + 60 * 60 * 1000);
        allBookingsForDay.forEach((booking) => {
            const bookingTime24h = convertTo24Hour(booking.scheduledTime);
            const [bookHours, bookMinutes] = bookingTime24h.split(":").map(Number);
            const bookingStart = new Date(booking.scheduledDate);
            bookingStart.setHours(bookHours, bookMinutes, 0, 0);
            const bookingEnd = new Date(bookingStart.getTime() + (booking.duration || 60) * 60 * 1000);
            if (searchSlotStart < bookingEnd && searchSlotEnd > bookingStart) {
                busyProviderIds.add(booking.providerId.toString());
            }
        });
        if (busyProviderIds.size === 0)
            return potentialProviders;
        return potentialProviders.filter((provider) => !busyProviderIds.has(provider._id.toString()));
    }
    async _enrichProvidersWithDetails(availableProviders, subCategoryId, filters) {
        const finalProviderIds = availableProviders.map((p) => p._id.toString());
        const [reviews, services] = await Promise.all([
            this._reviewRepository.findReviewsByProviderIds(finalProviderIds),
            this._serviceRepository.findAll({
                providerId: { $in: finalProviderIds },
            }),
        ]);
        const userIdsForReviews = [...new Set(reviews.map((r) => r.userId.toString()))];
        const users = userIdsForReviews.length > 0 ? await this._userRepository.findUsersByIds(userIdsForReviews) : [];
        const userMap = new Map(users.map((u) => [u._id.toString(), { name: u.name, profilePicture: u.profilePicture || "" }]));
        const reviewsByProvider = new Map();
        reviews.forEach((review) => {
            const pid = review.providerId.toString();
            if (!reviewsByProvider.has(pid))
                reviewsByProvider.set(pid, []);
            const userData = userMap.get(review.userId.toString());
            reviewsByProvider.get(pid).push({
                userName: userData?.name || "Anonymous",
                userImg: userData?.profilePicture || "",
                rating: review.rating,
                review: review.reviewText || "",
            });
        });
        return availableProviders.map((provider) => toBackendProviderDTO(provider, services, reviewsByProvider.get(provider._id.toString()) || [], subCategoryId, filters.lat, filters.long));
    }
    _isProviderOnLeave(provider, dateStr) {
        const date = new Date(dateStr.replace(/-/g, "/"));
        return provider.availability.leavePeriods.some((period) => {
            const from = new Date(period.from.replace(/-/g, "/"));
            const to = new Date(period.to.replace(/-/g, "/"));
            return date >= from && date <= to;
        });
    }
    _getDateOverride(provider, dateStr) {
        return provider.availability.dateOverrides.find((o) => o.date === dateStr);
    }
    _getWeeklySlots(provider, dayName) {
        const daySchedule = provider.availability.weeklySchedule.find((d) => d.day === dayName);
        return daySchedule && daySchedule.active ? daySchedule.slots : [];
    }
    _isSlotAvailable(slotStart, slotEnd, existingBookings, busySlots) {
        const bookingConflict = existingBookings.some((booking) => {
            const bookingTime24h = convertTo24Hour(booking.scheduledTime);
            const [hours, minutes] = bookingTime24h.split(":").map(Number);
            const bookingStart = new Date(booking.scheduledDate);
            bookingStart.setHours(hours, minutes, 0, 0);
            const durationMs = (booking.duration || 60) * 60 * 1000;
            const bookingEnd = new Date(bookingStart.getTime() + durationMs);
            return slotStart < bookingEnd && slotEnd > bookingStart;
        });
        if (bookingConflict)
            return false;
        const busySlotConflict = busySlots.some((busySlot) => {
            const [sh, sm] = busySlot.start.split(":").map(Number);
            const [eh, em] = busySlot.end.split(":").map(Number);
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
};
ProviderService = __decorate([
    injectable(),
    __param(0, inject(TYPES.ProviderRepository)),
    __param(1, inject(TYPES.ServiceRepository)),
    __param(2, inject(TYPES.UserRepository)),
    __param(3, inject(TYPES.CategoryRepository)),
    __param(4, inject(TYPES.BookingRepository)),
    __param(5, inject(TYPES.MessageRepository)),
    __param(6, inject(TYPES.ReviewRepository)),
    __param(7, inject(TYPES.PaymentRepository)),
    __param(8, inject(TYPES.SubscriptionPlanRepository)),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object, Object, Object, Object, Object])
], ProviderService);
export { ProviderService };
