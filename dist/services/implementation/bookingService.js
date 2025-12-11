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
exports.BookingService = void 0;
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../../di/type"));
const razorpay_1 = require("../../utils/razorpay");
const CustomError_1 = require("../../utils/CustomError");
const ErrorMessage_1 = require("../../enums/ErrorMessage");
const HttpStatusCode_1 = require("../../enums/HttpStatusCode");
const mongoose_1 = require("mongoose");
const userRoles_1 = require("../../enums/userRoles");
const booking_mapper_1 = require("../../utils/mappers/booking.mapper");
const booking_enum_1 = require("../../enums/booking.enum");
const payment_wallet_enum_1 = require("../../enums/payment&wallet.enum");
const otpGenerator_1 = require("../../utils/otpGenerator");
const emailService_1 = require("../../utils/emailService");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const commissionRule_1 = require("../../utils/helperFunctions/commissionRule");
const subscription_1 = require("../../utils/helperFunctions/subscription");
const locRangeCal_1 = require("../../utils/helperFunctions/locRangeCal");
const convertDurationToMinutes_1 = require("../../utils/helperFunctions/convertDurationToMinutes");
const date_fns_1 = require("date-fns");
let BookingService = class BookingService {
    constructor(bookingRepository, categoryRepository, commissionRuleRepository, paymentRepository, addressRepository, providerRepository, serviceRepository, userRepository, messageRepository, WalletRepository, reviewRepository, subscriptionPlanRepository) {
        this._bookingRepository = bookingRepository;
        this._categoryRepository = categoryRepository;
        this._commissionRuleRepository = commissionRuleRepository;
        this._paymentRepository = paymentRepository;
        this._addressRepository = addressRepository;
        this._providerRepository = providerRepository;
        this._serviceRepository = serviceRepository;
        this._userRepository = userRepository;
        this._messageRepository = messageRepository;
        this._walletRepository = WalletRepository;
        this._reviewRepository = reviewRepository;
        this._subscriptionPlanRepository = subscriptionPlanRepository;
    }
    createNewBooking(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const subCategoryId = data.serviceId;
            const providerId = data.providerId;
            const findServiceId = yield this._serviceRepository.findOne({ subCategoryId, providerId });
            data.serviceId = findServiceId._id.toString();
            const bookings = yield this._bookingRepository.create(data);
            return { bookingId: bookings._id.toString(), message: "your booking confirmed successfully" };
        });
    }
    createPayment(amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const order = yield (0, razorpay_1.paymentCreation)(amount);
            if (!order) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.INTERNAL_ERROR, HttpStatusCode_1.HttpStatusCode.INTERNAL_SERVER_ERROR);
            }
            return order;
        });
    }
    paymentVerification(verifyPayment) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            let { razorpay_order_id, razorpay_payment_id, razorpay_signature } = verifyPayment;
            if (verifyPayment.paymentMethod === userRoles_1.PaymentMethod.BANK) {
                const isValid = (0, razorpay_1.verifyPaymentSignature)(razorpay_order_id, razorpay_payment_id, razorpay_signature);
                if (!isValid)
                    throw new CustomError_1.CustomError("transaction is not legit", HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            const booking = yield this._bookingRepository.findById(verifyPayment.bookingId);
            const service = yield this._serviceRepository.findById(booking.serviceId.toString());
            const subCategory = yield this._categoryRepository.findById(service.subCategoryId.toString());
            const commissionRule = yield this._commissionRuleRepository.findOne({ categoryId: subCategory._id.toString() });
            let totalCommission = yield (0, commissionRule_1.calculateCommission)(verifyPayment.amount, commissionRule);
            totalCommission += yield (0, commissionRule_1.calculateParentCommission)(verifyPayment.amount, subCategory, this._categoryRepository, this._commissionRuleRepository);
            const provider = yield this._providerRepository.findById(verifyPayment.providerId.toString());
            if (((_a = provider === null || provider === void 0 ? void 0 : provider.subscription) === null || _a === void 0 ? void 0 : _a.status) === "ACTIVE") {
                const plan = yield this._subscriptionPlanRepository.findById(provider.subscription.planId.toString());
                totalCommission = (0, subscription_1.applySubscriptionAdjustments)(verifyPayment.amount, totalCommission, plan, commissionRule);
            }
            const updatedPayment = Object.assign(Object.assign({}, verifyPayment), { userId: new mongoose_1.Types.ObjectId(verifyPayment.userId), providerId: new mongoose_1.Types.ObjectId(verifyPayment.providerId), bookingId: new mongoose_1.Types.ObjectId(verifyPayment.bookingId), adminCommission: totalCommission, providerAmount: verifyPayment.amount - totalCommission });
            const createdPayment = yield this._paymentRepository.create(updatedPayment);
            if (verifyPayment.paymentMethod === userRoles_1.PaymentMethod.WALLET) {
                const wallet = yield this._walletRepository.findOne({ ownerId: verifyPayment.userId });
                wallet.balance -= verifyPayment.amount;
                yield this._walletRepository.update(wallet._id.toString(), wallet);
                yield this._walletRepository.createTransaction({
                    walletId: wallet._id,
                    transactionType: "debit",
                    source: "booking",
                    remarks: `Order ${razorpay_order_id}`,
                    amount: verifyPayment.amount,
                    status: payment_wallet_enum_1.TransactionStatus.PAYMENT,
                    description: `payment to ${service.title}`,
                });
            }
            const durationInMinutes = (0, convertDurationToMinutes_1.convertDurationToMinutes)(service.duration);
            const udpatedpayment123 = yield this._bookingRepository.update(verifyPayment.bookingId, {
                paymentId: createdPayment._id,
                paymentStatus: userRoles_1.PaymentStatus.PAID,
                duration: durationInMinutes,
            });
            return {
                message: "payment successfully verified",
                orderId: createdPayment.razorpay_order_id,
            };
        });
    }
    findBookingById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const booking = yield this._bookingRepository.findById(id);
            if (!booking) {
                throw new CustomError_1.CustomError('Your booking is not found, Please contact admin', HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            const address = booking.addressId
                ? yield this._addressRepository.findById(booking.addressId.toString())
                : null;
            if (!address) {
                throw new CustomError_1.CustomError('No matched address found', HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            const service = booking.serviceId
                ? yield this._serviceRepository.findById(booking.serviceId.toString())
                : null;
            if (!service) {
                throw new CustomError_1.CustomError('No service found', HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            const subCat = service.subCategoryId
                ? yield this._categoryRepository.findById(service.subCategoryId.toString())
                : null;
            if (!subCat) {
                throw new CustomError_1.CustomError('No service found', HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            const provider = booking.providerId
                ? yield this._providerRepository.findById(booking.providerId.toString())
                : null;
            if (!provider) {
                throw new CustomError_1.CustomError('No provider found', HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            const payment = booking.paymentId
                ? yield this._paymentRepository.findById(booking.paymentId.toString())
                : null;
            const reviewStats = yield this._reviewRepository.getReviewStatsByServiceIds([service._id.toString()]);
            const providerReviewStats = reviewStats.find(rs => rs.serviceId.toString() === service._id.toString());
            let review;
            if (booking.reviewed) {
                review = yield this._reviewRepository.findOne({ bookingId: booking._id.toString() });
            }
            return (0, booking_mapper_1.toBookingConfirmationPage)(booking, address, subCat.iconUrl, service, payment, provider, review, providerReviewStats === null || providerReviewStats === void 0 ? void 0 : providerReviewStats.avgRating, providerReviewStats === null || providerReviewStats === void 0 ? void 0 : providerReviewStats.reviewCount);
        });
    }
    getAllFilteredBookings(userId, filters) {
        return __awaiter(this, void 0, void 0, function* () {
            const { search, status } = filters;
            const [data, statusCounts] = yield Promise.all([
                this._bookingRepository.findBookingsForUserHistory(userId, { status, search }),
                this._bookingRepository.getBookingStatusCounts(userId, search)
            ]);
            const { bookings } = data;
            const counts = {
                [booking_enum_1.BookingStatus.All]: 0,
                [booking_enum_1.BookingStatus.PENDING]: 0,
                [booking_enum_1.BookingStatus.CONFIRMED]: 0,
                [booking_enum_1.BookingStatus.IN_PROGRESS]: 0,
                [booking_enum_1.BookingStatus.COMPLETED]: 0,
                [booking_enum_1.BookingStatus.CANCELLED]: 0,
                [booking_enum_1.BookingStatus.EXPIRED]: 0,
            };
            let allBookingsCount = 0;
            statusCounts.forEach((item) => {
                if (item._id && counts.hasOwnProperty(item._id)) {
                    counts[item._id] = item.count;
                }
                allBookingsCount += item.count;
            });
            counts.All = allBookingsCount;
            return {
                data: bookings,
                counts: counts
            };
        });
    }
    getBookingFor_Prov_mngmnt(providerId, search, status) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = yield this._providerRepository.findById(providerId);
            if (!provider) {
                throw new CustomError_1.CustomError("Provider not found", HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            const [data, statusCounts] = yield Promise.all([
                this._bookingRepository.findBookingsForProvider(providerId, { status: status, search: search }, 1, 1000),
                this._bookingRepository.getBookingStatusCountsForProvider(providerId, search)
            ]);
            const { bookings } = data;
            const counts = {
                [booking_enum_1.BookingStatus.All]: 0,
                [booking_enum_1.BookingStatus.PENDING]: 0,
                [booking_enum_1.BookingStatus.CONFIRMED]: 0,
                [booking_enum_1.BookingStatus.IN_PROGRESS]: 0,
                [booking_enum_1.BookingStatus.COMPLETED]: 0,
                [booking_enum_1.BookingStatus.CANCELLED]: 0,
                [booking_enum_1.BookingStatus.EXPIRED]: 0,
            };
            let allBookingsCount = 0;
            statusCounts.forEach((item) => {
                if (item._id && counts.hasOwnProperty(item._id)) {
                    counts[item._id] = item.count;
                }
                allBookingsCount += item.count;
            });
            counts.All = allBookingsCount;
            return {
                bookings: bookings,
                earnings: provider.earnings || 0,
                counts: counts
            };
        });
    }
    saveAndEmitMessage(io, messageData) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataToCreate = {
                joiningId: messageData.joiningId,
                senderId: messageData.senderId,
                messageType: messageData.messageType,
                text: messageData.text,
                fileUrl: messageData.fileUrl,
            };
            const savedMessage = yield this._messageRepository.create(dataToCreate);
            io.to(savedMessage.joiningId).emit("receiveBookingMessage", savedMessage);
            return savedMessage;
        });
    }
    getBookingMessages(joiningId) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this._messageRepository.findAllSorted(joiningId);
            return data;
        });
    }
    updateStatus(bookingId, status, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const booking = yield this._bookingRepository.findById(bookingId);
            if (!booking) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.BOOKING_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            if (booking.status === booking_enum_1.BookingStatus.CANCELLED) {
                return { message: ErrorMessage_1.ErrorMessage.BOOKING_IS_ALREADY_CANCELLED };
            }
            if (status === booking_enum_1.BookingStatus.IN_PROGRESS) {
                const dateTimeString = `${booking.scheduledTime} ${booking.scheduledDate}`;
                const scheduledTime = new Date(dateTimeString);
                const currenttimeStamp = new Date();
                const diffInMinutes = (scheduledTime.getTime() - currenttimeStamp.getTime()) / (1000 * 60);
                if (diffInMinutes > 5) {
                    throw new CustomError_1.CustomError("You can start the booking only 5 minutes before the scheduled time", HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
                }
            }
            let bookingOtp;
            const updatePayload = { status: status };
            if (status === booking_enum_1.BookingStatus.CANCELLED) {
                const userId = booking.userId.toString();
                const wallet = yield this._walletRepository.findOne({ ownerId: userId });
                let returAmount;
                if (booking.status === booking_enum_1.BookingStatus.CONFIRMED) {
                    returAmount = (Number(booking.amount) * 0.5);
                    wallet.balance += returAmount;
                }
                else {
                    returAmount = Number(booking.amount);
                    wallet.balance += returAmount;
                }
                yield this._walletRepository.update(wallet._id.toString(), wallet);
                const paymentId = booking.paymentId.toString();
                const payment = yield this._paymentRepository.findById(paymentId);
                const service = yield this._serviceRepository.findById(booking.serviceId.toString());
                yield this._walletRepository.createTransaction({
                    walletId: wallet._id,
                    transactionType: "credit",
                    source: "refund",
                    remarks: `Order ${payment.razorpay_order_id}`,
                    amount: returAmount,
                    status: payment_wallet_enum_1.TransactionStatus.REFUND,
                    description: `Refund Received from ${service.title}`,
                });
                updatePayload.paymentStatus = userRoles_1.PaymentStatus.REFUNDED;
            }
            else if (status === booking_enum_1.BookingStatus.COMPLETED) {
                const user = yield this._userRepository.findById(userId);
                if (!user) {
                    throw new CustomError_1.CustomError('userId not found', HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
                }
                yield this._bookingRepository.update(bookingId, updatePayload);
                const otp = (0, otpGenerator_1.generateOTP)();
                bookingOtp = jsonwebtoken_1.default.sign({ bookingId, otp }, process.env.JWT_SECRET, { expiresIn: "10m" });
                yield (0, emailService_1.sendBookingVerificationEmail)(String(user.email), otp);
                return {
                    message: `An OTP has been sent to Customers Email for verification, please verify that OTP`,
                    completionToken: bookingOtp
                };
            }
            yield this._bookingRepository.update(bookingId, { status: status });
            return {
                message: `Booking ${status === booking_enum_1.BookingStatus.IN_PROGRESS ? 'Started' : ''} ${status} Successfully`,
            };
        });
    }
    updateBookingDateTime(bookingId, date, time) {
        return __awaiter(this, void 0, void 0, function* () {
            const booking = yield this._bookingRepository.findById(bookingId);
            if (!booking) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.BOOKING_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            if (booking.status !== booking_enum_1.BookingStatus.PENDING) {
                throw new CustomError_1.CustomError("You can only udpate Date/Time on Pending", HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            yield this._bookingRepository.update(bookingId, { scheduledDate: date, scheduledTime: time });
        });
    }
    verifyOtp(data, bookingToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, otp } = data;
            const user = yield this._userRepository.findByEmail(email, true);
            if (!user) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.USER_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            try {
                const decoded = jsonwebtoken_1.default.verify(bookingToken, process.env.JWT_SECRET);
                if (!decoded) {
                    throw new CustomError_1.CustomError(`OTP ${ErrorMessage_1.ErrorMessage.TOKEN_EXPIRED}`, HttpStatusCode_1.HttpStatusCode.FORBIDDEN);
                }
                if (otp !== decoded.otp) {
                    throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.INVALID_OTP, HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
                }
                const booking = yield this._bookingRepository.findById(decoded.bookingId);
                if (!booking) {
                    throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.BOOKING_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
                }
                booking.status = booking_enum_1.BookingStatus.COMPLETED;
                yield this._bookingRepository.update(booking._id.toString(), booking);
                const [provider, payment, service] = yield Promise.all([
                    this._providerRepository.findOne({ userId: user._id.toString() }),
                    this._paymentRepository.findById(booking.paymentId.toString()),
                    this._serviceRepository.findById(booking.serviceId.toString())
                ]);
                const wallet = yield this._walletRepository.findOne({ ownerId: user._id.toString() });
                if (!wallet) {
                    yield this._walletRepository.create({
                        balance: payment.providerAmount,
                        ownerId: user._id,
                        ownerType: userRoles_1.Roles.PROVIDER,
                    });
                }
                else {
                    wallet.balance += payment.providerAmount;
                    provider.earnings += payment.providerAmount;
                    provider.totalBookings += 1;
                }
                yield this._walletRepository.createTransaction({
                    walletId: wallet._id,
                    transactionType: "credit",
                    source: "payment",
                    remarks: `Order ${payment.razorpay_order_id}`,
                    amount: payment.providerAmount,
                    status: payment_wallet_enum_1.TransactionStatus.PAYMENT,
                    description: `Payment Received from ${service.title}`,
                });
                yield this._providerRepository.update(provider._id.toString(), provider);
            }
            catch (error) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.OTP_VERIFICATION_FAILED, HttpStatusCode_1.HttpStatusCode.FORBIDDEN);
            }
        });
    }
    resendOtp(data, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email } = data;
            const user = yield this._userRepository.findByEmail(email, true);
            if (!user) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.USER_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            const newOtp = (0, otpGenerator_1.generateOTP)();
            const newBookingOtp = jsonwebtoken_1.default.sign({ userId, newOtp }, process.env.JWT_SECRET, { expiresIn: "10m" });
            yield (0, emailService_1.sendVerificationEmail)(email, newOtp);
            return {
                message: 'A new OTP has been sent to your email.',
                newCompletionToken: newBookingOtp
            };
        });
    }
    getAllBookingsForAdmin(page, limit, filters) {
        return __awaiter(this, void 0, void 0, function* () {
            const bookingFilter = {};
            if (filters.search) {
                const searchRegex = { $regex: filters.search, $options: 'i' };
                const [matchedUsers, matchedProviders] = yield Promise.all([
                    this._userRepository.findAll({ name: searchRegex }),
                    this._providerRepository.findAll({ fullName: searchRegex })
                ]);
                const userIds = matchedUsers.map(u => u._id);
                const providerIds = matchedProviders.map(p => p._id);
                bookingFilter.$or = [
                    { userId: { $in: userIds } },
                    { providerId: { $in: providerIds } }
                ];
            }
            if (filters.bookingStatus && filters.bookingStatus !== 'All') {
                bookingFilter.status = filters.bookingStatus;
            }
            if (filters.dateRange && filters.dateRange !== 'All') {
                const now = new Date();
                let startDate;
                let endDate;
                switch (filters.dateRange) {
                    case 'All':
                        startDate = (0, date_fns_1.startOfDay)(now);
                        endDate = (0, date_fns_1.endOfDay)(now);
                        break;
                    case 'Last 7 Days':
                        startDate = (0, date_fns_1.startOfWeek)(now);
                        endDate = (0, date_fns_1.endOfWeek)(now);
                        break;
                    case 'Last 30 Days':
                        startDate = (0, date_fns_1.startOfMonth)(now);
                        endDate = (0, date_fns_1.endOfMonth)(now);
                        break;
                    default:
                        break;
                }
                if (startDate && endDate) {
                    bookingFilter.createdAt = {
                        $gte: startDate,
                        $lte: endDate,
                    };
                }
            }
            const allBookings = yield this._bookingRepository.findAll(bookingFilter, { createdAt: -1 });
            const totalBookings = allBookings.length;
            const paginatedBookings = allBookings.slice((page - 1) * limit, page * limit);
            const userIds = [...new Set(paginatedBookings.map(b => { var _a; return (_a = b.userId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean))];
            const providerIds = [...new Set(paginatedBookings.map(b => { var _a; return (_a = b.providerId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean))];
            const serviceIds = [...new Set(paginatedBookings.map(b => { var _a; return (_a = b.serviceId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean))];
            const [users, providers, services] = yield Promise.all([
                this._userRepository.findAll({ _id: { $in: userIds } }),
                this._providerRepository.findAll({ _id: { $in: providerIds } }),
                this._serviceRepository.findAll({ _id: { $in: serviceIds } })
            ]);
            const userMap = new Map(users.map(u => [u.id, u]));
            const providerMap = new Map(providers.map(p => [p.id, p]));
            const serviceMap = new Map(services.map(s => [s.id, s]));
            const bookings = paginatedBookings.map(booking => {
                var _a, _b, _c;
                const user = userMap.get((_a = booking.userId) === null || _a === void 0 ? void 0 : _a.toString());
                const provider = providerMap.get((_b = booking.providerId) === null || _b === void 0 ? void 0 : _b.toString());
                const service = serviceMap.get((_c = booking.serviceId) === null || _c === void 0 ? void 0 : _c.toString());
                return {
                    id: booking._id.toString(),
                    userName: (user === null || user === void 0 ? void 0 : user.name) || 'N/A',
                    userAvatar: (user === null || user === void 0 ? void 0 : user.profilePicture) || null,
                    providerName: (provider === null || provider === void 0 ? void 0 : provider.fullName) || 'N/A',
                    serviceType: (service === null || service === void 0 ? void 0 : service.title) || 'N/A',
                    dateTime: `${booking.scheduledDate || ''} ${booking.scheduledTime || ''}`.trim(),
                    paymentStatus: booking.paymentStatus,
                    bookingStatus: booking.status,
                };
            });
            return {
                bookings,
                totalBookings,
                currentPage: page,
                totalPages: Math.ceil(totalBookings / limit),
            };
        });
    }
    findProviderRange(userId, userRole, serviceId, lat, lng, radius) {
        return __awaiter(this, void 0, void 0, function* () {
            const services = yield this._serviceRepository.findAll({ subCategoryId: serviceId });
            if (!services || services.length <= 0) {
                throw new CustomError_1.CustomError('Currently no service available', HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            let currentProviderId = null;
            if (userRole === userRoles_1.Roles.PROVIDER) {
                const currentProvider = yield this._providerRepository.findOne({ userId });
                if (currentProvider) {
                    currentProviderId = currentProvider._id.toString();
                }
            }
            const providerids = services.map(s => s.providerId.toString()).filter(id => id !== currentProviderId);
            const providers = yield this._providerRepository.findAll({ _id: { $in: providerids } });
            return (0, locRangeCal_1.isProviderInRange)(providers, lat, lng, radius);
        });
    }
    createBookingFromBot(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const booking = yield this._bookingRepository.create(Object.assign(Object.assign({}, data), { status: booking_enum_1.BookingStatus.PENDING, paymentStatus: userRoles_1.PaymentStatus.UNPAID, bookingDate: new Date() }));
            return booking;
        });
    }
    getBookingDetailsForAdmin(bookingId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const booking = yield this._bookingRepository.findById(bookingId);
            if (!booking)
                throw new CustomError_1.CustomError("Booking not found", HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            const [user, provider, service, address, payment] = yield Promise.all([
                this._userRepository.findById(((_a = booking.userId) === null || _a === void 0 ? void 0 : _a.toString()) || ""),
                this._providerRepository.findById(((_b = booking.providerId) === null || _b === void 0 ? void 0 : _b.toString()) || ""),
                this._serviceRepository.findById(((_c = booking.serviceId) === null || _c === void 0 ? void 0 : _c.toString()) || ""),
                this._addressRepository.findById(((_d = booking.addressId) === null || _d === void 0 ? void 0 : _d.toString()) || ""),
                booking.paymentId ? this._paymentRepository.findById(booking.paymentId.toString()) : null
            ]);
            return {
                booking: {
                    _id: booking._id.toString(),
                    status: booking.status,
                    paymentStatus: booking.paymentStatus,
                    amount: booking.amount,
                    date: booking.scheduledDate,
                    time: booking.scheduledTime,
                    createdAt: new Date(booking.createdAt).toISOString(),
                    instructions: booking.instructions,
                },
                user: user ? {
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    image: user.profilePicture
                } : null,
                provider: provider ? {
                    _id: provider._id.toString(),
                    name: provider.fullName,
                    email: provider.email,
                    phone: provider.phoneNumber,
                    image: provider.profilePhoto,
                    serviceArea: provider.serviceArea
                } : null,
                service: service ? {
                    title: service.title,
                    duration: service.duration,
                    price: service.price
                } : null,
                address: address ? {
                    label: address.label,
                    fullAddress: `${address.street}, ${address.city}, ${address.state} - ${address.zip}`,
                } : null,
                payment: payment ? {
                    method: payment.paymentMethod,
                    transactionId: (payment.razorpay_payment_id || payment._id.toString()),
                    date: new Date(payment.paymentDate).toISOString()
                } : null
            };
        });
    }
};
exports.BookingService = BookingService;
exports.BookingService = BookingService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.BookingRepository)),
    __param(1, (0, inversify_1.inject)(type_1.default.CategoryRepository)),
    __param(2, (0, inversify_1.inject)(type_1.default.CommissionRuleRepository)),
    __param(3, (0, inversify_1.inject)(type_1.default.PaymentRepository)),
    __param(4, (0, inversify_1.inject)(type_1.default.AddressRepository)),
    __param(5, (0, inversify_1.inject)(type_1.default.ProviderRepository)),
    __param(6, (0, inversify_1.inject)(type_1.default.ServiceRepository)),
    __param(7, (0, inversify_1.inject)(type_1.default.UserRepository)),
    __param(8, (0, inversify_1.inject)(type_1.default.MessageRepository)),
    __param(9, (0, inversify_1.inject)(type_1.default.WalletRepository)),
    __param(10, (0, inversify_1.inject)(type_1.default.ReviewRepository)),
    __param(11, (0, inversify_1.inject)(type_1.default.SubscriptionPlanRepository)),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object])
], BookingService);
