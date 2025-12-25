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
exports.AuthController = void 0;
const inversify_1 = require("inversify");
const cloudinaryUpload_1 = require("../utils/cloudinaryUpload");
const type_1 = __importDefault(require("../di/type"));
const HttpStatusCode_1 = require("../enums/HttpStatusCode");
const auth_validation_1 = require("../utils/validations/auth.validation");
const CustomError_1 = require("../utils/CustomError");
let AuthController = class AuthController {
    constructor(authService) {
        this.register = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const validatedBody = auth_validation_1.registerSchema.parse(req.body);
                const response = yield this._authService.registerUser(validatedBody);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.login = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, password } = auth_validation_1.loginSchema.parse(req.body);
                const result = yield this._authService.login(email, password);
                let token = result.token;
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'strict',
                    maxAge: 60 * 60 * 1000 //1h
                });
                res.cookie('refreshToken', result.refreshToken, {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000 //7d
                });
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(result);
            }
            catch (error) {
                next(error);
            }
        });
        this.verifyOtp = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const validatedBody = auth_validation_1.verifyOtpSchema.parse(req.body);
                const response = yield this._authService.verifyOtp(validatedBody);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.resendOtp = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const validatedBody = auth_validation_1.emailOnlySchema.parse(req.body);
                const response = yield this._authService.resendOtp(validatedBody);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.forgotPassword = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const validatedBody = auth_validation_1.emailOnlySchema.parse(req.body);
                const response = yield this._authService.requestPasswordReset(validatedBody);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.resetPassword = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const validatedBody = auth_validation_1.resetPasswordSchema.parse(req.body);
                const response = yield this._authService.resetPassword(validatedBody);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.googleLogin = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { token } = auth_validation_1.googleLoginSchema.parse(req.body);
                const response = yield this._authService.googleAuthLogin(token);
                let jwtToken = response.token;
                res.cookie('token', jwtToken, {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'strict',
                    maxAge: 24 * 60 * 60 * 1000 //1h
                });
                res.cookie('refreshToken', response.refreshToken, {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000 //7d
                });
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.refreshToken = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const refresh_token = req.cookies.refreshToken;
                if (!refresh_token) {
                    throw new CustomError_1.CustomError('Refresh token not found', HttpStatusCode_1.HttpStatusCode.UNAUTHORIZED);
                }
                const response = yield this._authService.createRefreshToken(refresh_token);
                res.cookie('token', response.newToken, {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'strict',
                    maxAge: 24 * 60 * 60 * 1000 //7d
                });
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.contactUsEmail = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, email, message } = auth_validation_1.contactUsSchema.parse(req.body);
                const response = yield this._authService.sendSubmissionEmail(name, email, message);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.getUser = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const token = req.cookies.token;
                const user = yield this._authService.getUser(token);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(user);
            }
            catch (error) {
                next(error);
            }
        });
        this.updateProfile = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { name, email } = auth_validation_1.updateProfileSchema.parse(req.body);
                const token = req.cookies.token;
                const profilePicturePath = (_a = req.file) === null || _a === void 0 ? void 0 : _a.path;
                let profilePicture;
                if (profilePicturePath) {
                    profilePicture = yield (0, cloudinaryUpload_1.uploadToCloudinary)(profilePicturePath);
                }
                else if (req.body.iconUrl === '') {
                    profilePicture = null;
                }
                else if (req.body.iconUrl !== undefined) {
                    profilePicture = req.body.iconUrl;
                }
                const updatedUser = yield this._authService.updateProfile(token, { name, email, profilePicture });
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(updatedUser);
            }
            catch (error) {
                next(error);
            }
        });
        this.generateOtp = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const { email } = req.body;
                const response = yield this._authService.generateOtp(userId, email);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.getUserWithRelated = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const search = req.query.search || '';
                const status = req.query.status || "All";
                const userWithDetails = yield this._authService.getUserWithAllDetails(page, limit, search, status);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(userWithDetails);
            }
            catch (error) {
                next(error);
            }
        });
        this.updateUser = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.params.userId;
                const reason = req.body.reason ? req.body.reason : undefined;
                const updatedUser = yield this._authService.updateUser(userId, reason);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(updatedUser);
            }
            catch (error) {
                next(error);
            }
        });
        this.logout = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const refreshToken = req.cookies.refreshToken;
                yield this._authService.logout(refreshToken);
                res.cookie('token', '', {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'strict',
                    expires: new Date(0)
                });
                res.cookie('refreshToken', '', {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'strict',
                    expires: new Date(0)
                });
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({ message: 'Logged out successfully' });
            }
            catch (error) {
                res.cookie('token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', expires: new Date(0) });
                res.cookie('refreshToken', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', expires: new Date(0) });
                next(error);
            }
        });
        this.getAllDataForChatBot = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const response = yield this._authService.getAllDataForChatBot(userId);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.getUserDetailsForAdmin = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                if (!userId) {
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ message: 'User ID is required' });
                }
                const userDetails = yield this._authService.getUserDetailsForAdmin(userId);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(userDetails);
            }
            catch (error) {
                next(error);
            }
        });
        this.searchResources = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const query = req.query.query || '';
                const result = yield this._authService.searchResources(query);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(result);
            }
            catch (error) {
                next(error);
            }
        });
        this._authService = authService;
    }
};
exports.AuthController = AuthController;
exports.AuthController = AuthController = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.AuthService)),
    __metadata("design:paramtypes", [Object])
], AuthController);
