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
exports.AuthService = void 0;
const inversify_1 = require("inversify");
const otpGenerator_1 = require("../../utils/otpGenerator");
const emailService_1 = require("../../utils/emailService");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const google_auth_library_1 = require("google-auth-library");
const type_1 = __importDefault(require("../../di/type"));
const CustomError_1 = require("../../utils/CustomError");
const ErrorMessage_1 = require("../../enums/ErrorMessage");
const HttpStatusCode_1 = require("../../enums/HttpStatusCode");
const logger_1 = __importDefault(require("../../logger/logger"));
const booking_enum_1 = require("../../enums/booking.enum");
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;
const PASSWORD_RESET_EXPIRY_MINUTES = parseInt(process.env.PASSWORD_RESET_EXPIRY_MINUTES, 10) || 60;
let AuthService = class AuthService {
    constructor(userRepository, bookingRepository, providerRepository, categoryRepository, serviceRepository) {
        this.getAllDataForChatBot = (userId) => __awaiter(this, void 0, void 0, function* () {
            const user = yield this._userRepository.findById(userId);
            if (!user) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.USER_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            const bookings = yield this._bookingRepository.findAll({ userId });
            const providers = yield this._providerRepository.findAll();
            const categories = yield this._categoryRepository.getAllCategories();
            const services = yield this._serviceRepository.findAll();
            return { categories, services, providers, bookings };
        });
        this._userRepository = userRepository;
        this._bookingRepository = bookingRepository;
        this._providerRepository = providerRepository;
        this._categoryRepository = categoryRepository;
        this._serviceRepository = serviceRepository;
    }
    registerUser(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { name, email, password } = data;
            let user = yield this._userRepository.findByEmail(email);
            if (user && user.isVerified) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.USER_ALREADY_EXISTS, HttpStatusCode_1.HttpStatusCode.CONFLICT);
            }
            if (!user) {
                user = yield this._userRepository.create({ name, email, password });
            }
            else {
                user.name = name;
                user.password = password;
                user.isVerified = false;
            }
            const otp = (0, otpGenerator_1.generateOTP)();
            user.registrationOtp = otp;
            user.registrationOtpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
            user.registrationOtpAttempts = 0;
            yield this._userRepository.update(user._id.toString(), user);
            yield (0, emailService_1.sendVerificationEmail)(email, otp);
            return {
                message: 'Registration successful! An OTP has been sent to your email for verification.',
                email: String(user.email),
            };
        });
    }
    verifyOtp(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, otp } = data;
            const user = yield this._userRepository.findByEmail(email, true);
            if (!user) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.USER_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            if (user.isVerified) {
                return { message: 'Account already verified.' };
            }
            if (typeof user.registrationOtpAttempts === 'number' && user.registrationOtpAttempts >= MAX_OTP_ATTEMPTS) {
                throw new CustomError_1.CustomError(`Too many failed OTP attempts. Please request a new OTP.`, HttpStatusCode_1.HttpStatusCode.FORBIDDEN);
            }
            if (!user.registrationOtp || user.registrationOtp !== otp) {
                user.registrationOtpAttempts = (typeof user.registrationOtpAttempts === 'number' ? user.registrationOtpAttempts : 0) + 1;
                yield this._userRepository.update(user._id.toString(), user);
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.INVALID_OTP, HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            if (!user.registrationOtpExpires || new Date() > user.registrationOtpExpires) {
                user.registrationOtp = undefined;
                user.registrationOtpExpires = undefined;
                user.registrationOtpAttempts = 0;
                yield this._userRepository.update(user._id.toString(), user);
                throw new CustomError_1.CustomError('OTP has expired. Please request a new one.', HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            user.isVerified = true;
            user.registrationOtp = undefined;
            user.registrationOtpExpires = undefined;
            user.registrationOtpAttempts = 0;
            yield this._userRepository.update(user._id.toString(), user);
            return { message: 'Account successfully verified!' };
        });
    }
    resendOtp(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email } = data;
            const user = yield this._userRepository.findByEmail(email, true);
            if (!user) {
                return { message: 'If an account with this email exists, a new OTP has been sent.' };
            }
            if (user.isVerified) {
                return { message: 'Account already verified. Please proceed to login.' };
            }
            if (user.registrationOtpExpires && user.registrationOtpExpires instanceof Date) {
                const timeSinceLastOtpSent = Date.now() - (user.registrationOtpExpires.getTime() - (OTP_EXPIRY_MINUTES * 60 * 1000));
                if (timeSinceLastOtpSent < RESEND_COOLDOWN_SECONDS * 1000) {
                    const remainingSeconds = RESEND_COOLDOWN_SECONDS - Math.floor(timeSinceLastOtpSent / 1000);
                    throw new CustomError_1.CustomError(`Please wait ${remainingSeconds} seconds before requesting another OTP.`, 429);
                }
            }
            const newOtp = (0, otpGenerator_1.generateOTP)();
            user.registrationOtp = newOtp;
            user.registrationOtpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
            user.registrationOtpAttempts = 0;
            yield this._userRepository.update(user._id.toString(), user);
            yield (0, emailService_1.sendVerificationEmail)(email, newOtp);
            return { message: 'A new OTP has been sent to your email.' };
        });
    }
    login(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this._userRepository.findByEmail(email, true);
            if (!user || !user.password) {
                throw new CustomError_1.CustomError('Invalid Credentails', HttpStatusCode_1.HttpStatusCode.UNAUTHORIZED);
            }
            if (!user.isVerified) {
                throw new CustomError_1.CustomError(`Account not verified. Please verify your email or contact admin.`, HttpStatusCode_1.HttpStatusCode.FORBIDDEN);
            }
            const isMatch = yield bcryptjs_1.default.compare(password, String(user.password));
            if (!isMatch) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.INVALID_CREDENTIALS, HttpStatusCode_1.HttpStatusCode.UNAUTHORIZED);
            }
            const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
            const refreshToken = jsonwebtoken_1.default.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
            user.refreshToken = refreshToken;
            yield this._userRepository.update(user._id.toString(), user);
            return {
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: (typeof user.role === 'string' ? user.role : 'Customer'),
                    isVerified: Boolean(user.isVerified),
                    profilePicture: typeof user.profilePicture === 'string' ? user.profilePicture : undefined,
                },
                token,
                refreshToken,
            };
        });
    }
    requestPasswordReset(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, currentPassword } = data;
            const user = yield this._userRepository.findByEmail(email, true);
            if (!user) {
                return { message: 'If an account with that email exists, a password reset link has been sent.' };
            }
            if (currentPassword) {
                const isMatch = yield bcryptjs_1.default.compare(currentPassword, String(user.password));
                if (!isMatch) {
                    throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.INVALID_CREDENTIALS, HttpStatusCode_1.HttpStatusCode.UNAUTHORIZED);
                }
            }
            const resetToken = crypto_1.default.randomBytes(32).toString('hex');
            user.passwordResetToken = resetToken;
            user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);
            yield this._userRepository.update(user._id.toString(), user);
            const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
            logger_1.default.info('the reset link', resetLink);
            yield (0, emailService_1.sendPasswordResetEmail)(String(user.email), resetLink);
            return { message: 'A password reset link has been sent to your email.' };
        });
    }
    resetPassword(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { token, newPassword, confirmNewPassword } = data;
            if (newPassword !== confirmNewPassword) {
                throw new CustomError_1.CustomError('Passwords do not match.', HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            const user = yield this._userRepository.findByPasswordResetToken(token);
            if (!user) {
                throw new CustomError_1.CustomError('Invalid or expired password reset token.', HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            const hashedPassword = yield bcryptjs_1.default.hash(newPassword, 10);
            yield this._userRepository.update(user._id.toString(), {
                password: hashedPassword,
                passwordResetToken: undefined,
                passwordResetExpires: undefined,
            });
            return { message: 'Your password has been reset successfully.' };
        });
    }
    googleAuthLogin(token) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
            const ticket = yield client.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            if (!payload || !payload.email || !payload.name || !payload.sub) {
                throw new CustomError_1.CustomError('Invalid Google token payload.', HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            const { email, name, sub: googleId } = payload;
            let user = yield this._userRepository.findByGoogleId(googleId);
            if (!user) {
                user = yield this._userRepository.findByEmail(email);
                if (user) {
                    if (!user.googleId) {
                        user.googleId = googleId;
                        user.provider = 'google';
                        yield this._userRepository.update(user._id.toString(), user);
                    }
                }
                else {
                    user = yield this._userRepository.create({
                        name,
                        email,
                        googleId,
                        provider: 'google',
                        password: '',
                        role: 'Customer',
                        isVerified: true,
                    });
                }
            }
            const jwtToken = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
            const refreshToken = jsonwebtoken_1.default.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
            user.refreshToken = refreshToken;
            yield this._userRepository.update(user._id.toString(), user);
            return {
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: (typeof user.role === 'string' ? user.role : 'Customer'),
                },
                token: jwtToken,
                refreshToken,
            };
        });
    }
    createRefreshToken(refresh_token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const decoded = jsonwebtoken_1.default.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET);
                const user = yield this._userRepository.findByIdForRefreshToken(decoded.id);
                if (!user || user.refreshToken !== refresh_token) {
                    throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.MISSING_TOKEN, HttpStatusCode_1.HttpStatusCode.FORBIDDEN);
                }
                const newToken = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
                return { newToken };
            }
            catch (err) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.INVALID_REFRESH_TOKEN, HttpStatusCode_1.HttpStatusCode.FORBIDDEN);
            }
        });
    }
    sendSubmissionEmail(name, email, message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, emailService_1.sendContactUsEmail)(name, email, message);
                return { message: "Email sent successfully" };
            }
            catch (error) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.INTERNAL_ERROR, HttpStatusCode_1.HttpStatusCode.INTERNAL_SERVER_ERROR);
            }
        });
    }
    getUser(token) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!token) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.MISSING_TOKEN, HttpStatusCode_1.HttpStatusCode.UNAUTHORIZED);
            }
            let decoded;
            try {
                decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            }
            catch (error) {
                throw new Error('Invalid token.');
            }
            const user = yield this._userRepository.findById(decoded.id);
            if (!user) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.USER_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            return {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: (typeof user.role === 'string' ? user.role : 'Customer'),
                isVerified: Boolean(user.isVerified),
                profilePicture: typeof user.profilePicture === 'string' ? user.profilePicture : undefined,
            };
        });
    }
    updateProfile(token, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!token) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.MISSING_TOKEN, HttpStatusCode_1.HttpStatusCode.UNAUTHORIZED);
            }
            let decoded;
            try {
                decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            }
            catch (error) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.INVALID_TOKEN, HttpStatusCode_1.HttpStatusCode.UNAUTHORIZED);
            }
            const user = yield this._userRepository.findById(decoded.id);
            if (!user) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.USER_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            user.name = data.name || user.name;
            user.email = data.email || user.email;
            if (data.profilePicture) {
                user.profilePicture = data.profilePicture;
            }
            const updatedUser = yield this._userRepository.update(user._id.toString(), user);
            const {} = updatedUser;
            return {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: (typeof user.role === 'string' ? user.role : 'Customer'),
                isVerified: Boolean(user.isVerified),
                profilePicture: typeof user.profilePicture === 'string' ? user.profilePicture : undefined,
            };
        });
    }
    getUserWithAllDetails(page, limit, search, status) {
        return __awaiter(this, void 0, void 0, function* () {
            const [users, total] = yield Promise.all([
                this._userRepository.findUsersWithFilter({ search: search, status: status }, page, limit),
                this._userRepository.countUsers({ search: search, status: status }),
            ]);
            if (!users || users.length === 0) {
                return {
                    users: [],
                    total: 0,
                    totalPages: 0,
                    currentPage: 1
                };
            }
            const mappedUsers = users.map(user => ({
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: typeof user.role === 'string' ? user.role : 'Customer',
                isVerified: Boolean(user.isVerified),
                profilePicture: typeof user.profilePicture === 'string' ? user.profilePicture : undefined,
            }));
            return {
                users: mappedUsers,
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
            };
        });
    }
    updateUser(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this._userRepository.findById(id);
            if (!user) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.USER_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            user.isVerified = !user.isVerified;
            yield this._userRepository.update(user._id.toString(), user);
            return {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: (typeof user.role === 'string' ? user.role : 'Customer'),
                isVerified: Boolean(user.isVerified),
                profilePicture: typeof user.profilePicture === 'string' ? user.profilePicture : undefined,
            };
        });
    }
    logout(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!refreshToken) {
                return { message: 'No refresh token provided for logout.' };
            }
            try {
                const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
                const user = yield this._userRepository.findById(decoded.id);
                if (user && user.refreshToken === refreshToken) {
                    user.refreshToken = null;
                    yield this._userRepository.update(user._id.toString(), user);
                    return { message: 'Logged out successfully and refresh token invalidated.' };
                }
                else {
                    return { message: 'Refresh token not found or already invalidated in database. Logout complete.' };
                }
            }
            catch (error) {
                console.error('Logout failed due to refresh token error:', error);
                return { message: 'Logout process complete (refresh token was invalid or expired).' };
            }
        });
    }
    getUserDetailsForAdmin(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this._userRepository.findById(userId);
            if (!user) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.USER_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            const providerProfile = yield this._providerRepository.findOne({ userId });
            const bookings = yield this._bookingRepository.findAll({ userId });
            const serviceIds = [...new Set(bookings.map(b => { var _a; return (_a = b.serviceId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean))];
            const providerIds = [...new Set(bookings.map(b => { var _a; return (_a = b.providerId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean))];
            const [services, providers] = yield Promise.all([
                this._serviceRepository.findAll({ _id: { $in: serviceIds } }),
                this._providerRepository.findAll({ _id: { $in: providerIds } })
            ]);
            const serviceTitleMap = new Map();
            services.forEach(service => serviceTitleMap.set(service._id.toString(), service.title));
            const providerNameMap = new Map();
            providers.forEach(provider => providerNameMap.set(provider._id.toString(), provider.fullName));
            const bookingStats = { completed: 0, canceled: 0, pending: 0 };
            const bookingHistory = bookings.map(booking => {
                var _a, _b, _c, _d;
                switch (booking.status) {
                    case booking_enum_1.BookingStatus.COMPLETED:
                        bookingStats.completed++;
                        break;
                    case booking_enum_1.BookingStatus.CANCELLED:
                        bookingStats.canceled++;
                        break;
                    case booking_enum_1.BookingStatus.PENDING:
                        bookingStats.pending++;
                        break;
                }
                return {
                    id: booking._id.toString(),
                    providerName: providerNameMap.get((_b = (_a = booking.providerId) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : '') || 'N/A',
                    service: serviceTitleMap.get((_d = (_c = booking.serviceId) === null || _c === void 0 ? void 0 : _c.toString()) !== null && _d !== void 0 ? _d : '') || 'N/A',
                    bookingDate: booking.createdAt ? new Date(booking.createdAt).toISOString().split('T')[0] : 'N/A',
                    serviceDate: String(booking.scheduledDate || 'N/A'),
                    status: booking.status,
                };
            });
            const userDetailsResponse = {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                avatarUrl: user.profilePicture || null,
                phone: (providerProfile === null || providerProfile === void 0 ? void 0 : providerProfile.phoneNumber) || 'N/A',
                registrationDate: user.createdAt.toISOString().split('T')[0],
                lastLogin: user.updatedAt.toISOString().split('T')[0],
                isActive: user.isVerified,
                totalBookings: bookings.length,
                bookingStats,
                bookingHistory,
            };
            return userDetailsResponse;
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.UserRepository)),
    __param(1, (0, inversify_1.inject)(type_1.default.BookingRepository)),
    __param(2, (0, inversify_1.inject)(type_1.default.ProviderRepository)),
    __param(3, (0, inversify_1.inject)(type_1.default.CategoryRepository)),
    __param(4, (0, inversify_1.inject)(type_1.default.ServiceRepository)),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object])
], AuthService);
