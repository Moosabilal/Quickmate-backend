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
import {} from "../services/interface/IAuthService.js";
import {} from "../interface/auth.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";
import TYPES from "../di/type.js";
import {} from "../middleware/authMiddleware.js";
import { HttpStatusCode } from "../enums/HttpStatusCode.js";
import { registerSchema, loginSchema, verifyOtpSchema, emailOnlySchema, resetPasswordSchema, googleLoginSchema, contactUsSchema, updateProfileSchema, } from "../utils/validations/auth.validation.js";
import { CustomError } from "../utils/CustomError.js";
let AuthController = class AuthController {
    _authService;
    constructor(authService) {
        this._authService = authService;
    }
    register = async (req, res, next) => {
        try {
            const validatedBody = registerSchema.parse(req.body);
            const response = await this._authService.registerUser(validatedBody);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    login = async (req, res, next) => {
        try {
            const { email, password } = loginSchema.parse(req.body);
            const result = await this._authService.login(email, password);
            const token = result.token;
            res.cookie("token", token, {
                httpOnly: true,
                secure: false,
                sameSite: "strict",
                maxAge: 60 * 60 * 1000, //1h
            });
            res.cookie("refreshToken", result.refreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000, //7d
            });
            res.status(HttpStatusCode.OK).json(result);
        }
        catch (error) {
            next(error);
        }
    };
    verifyOtp = async (req, res, next) => {
        try {
            const validatedBody = verifyOtpSchema.parse(req.body);
            const response = await this._authService.verifyOtp(validatedBody);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    resendOtp = async (req, res, next) => {
        try {
            const validatedBody = emailOnlySchema.parse(req.body);
            const response = await this._authService.resendOtp(validatedBody);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    forgotPassword = async (req, res, next) => {
        try {
            const validatedBody = emailOnlySchema.parse(req.body);
            const response = await this._authService.requestPasswordReset(validatedBody);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    resetPassword = async (req, res, next) => {
        try {
            const validatedBody = resetPasswordSchema.parse(req.body);
            const response = await this._authService.resetPassword(validatedBody);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    googleLogin = async (req, res, next) => {
        try {
            const { token } = googleLoginSchema.parse(req.body);
            const response = await this._authService.googleAuthLogin(token);
            const jwtToken = response.token;
            res.cookie("token", jwtToken, {
                httpOnly: true,
                secure: false,
                sameSite: "strict",
                maxAge: 24 * 60 * 60 * 1000, //1h
            });
            res.cookie("refreshToken", response.refreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000, //7d
            });
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    refreshToken = async (req, res, next) => {
        try {
            const refresh_token = req.cookies.refreshToken;
            if (!refresh_token) {
                throw new CustomError("Refresh token not found", HttpStatusCode.UNAUTHORIZED);
            }
            const response = await this._authService.createRefreshToken(refresh_token);
            res.cookie("token", response.newToken, {
                httpOnly: true,
                secure: false,
                sameSite: "strict",
                maxAge: 24 * 60 * 60 * 1000, //7d
            });
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    contactUsEmail = async (req, res, next) => {
        try {
            const { name, email, message } = contactUsSchema.parse(req.body);
            const response = await this._authService.sendSubmissionEmail(name, email, message);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    getUser = async (req, res, next) => {
        try {
            const token = req.cookies.token;
            const user = await this._authService.getUser(token);
            res.status(HttpStatusCode.OK).json(user);
        }
        catch (error) {
            next(error);
        }
    };
    updateProfile = async (req, res, next) => {
        try {
            const { name, email } = updateProfileSchema.parse(req.body);
            const token = req.cookies.token;
            const profilePicturePath = req.file?.path;
            let profilePicture;
            if (profilePicturePath) {
                profilePicture = await uploadToCloudinary(profilePicturePath);
            }
            else if (req.body.iconUrl === "") {
                profilePicture = null;
            }
            else if (req.body.iconUrl !== undefined) {
                profilePicture = req.body.iconUrl;
            }
            const updatedUser = await this._authService.updateProfile(token, {
                name,
                email,
                profilePicture,
            });
            res.status(HttpStatusCode.OK).json(updatedUser);
        }
        catch (error) {
            next(error);
        }
    };
    generateOtp = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { email } = req.body;
            const response = await this._authService.generateOtp(userId, email);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    getUserWithRelated = async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || "";
            const status = req.query.status || "All";
            const userWithDetails = await this._authService.getUserWithAllDetails(page, limit, search, status);
            res.status(HttpStatusCode.OK).json(userWithDetails);
        }
        catch (error) {
            next(error);
        }
    };
    updateUser = async (req, res, next) => {
        try {
            const userId = req.params.userId;
            const reason = req.body.reason ? req.body.reason : undefined;
            const updatedUser = await this._authService.updateUser(userId, reason);
            res.status(HttpStatusCode.OK).json(updatedUser);
        }
        catch (error) {
            next(error);
        }
    };
    logout = async (req, res, next) => {
        try {
            const refreshToken = req.cookies.refreshToken;
            await this._authService.logout(refreshToken);
            res.cookie("token", "", {
                httpOnly: true,
                secure: false,
                sameSite: "strict",
                expires: new Date(0),
            });
            res.cookie("refreshToken", "", {
                httpOnly: true,
                secure: false,
                sameSite: "strict",
                expires: new Date(0),
            });
            res.status(HttpStatusCode.OK).json({ message: "Logged out successfully" });
        }
        catch (error) {
            res.cookie("token", "", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                expires: new Date(0),
            });
            res.cookie("refreshToken", "", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                expires: new Date(0),
            });
            next(error);
        }
    };
    getAllDataForChatBot = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const response = await this._authService.getAllDataForChatBot(userId);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    getUserDetailsForAdmin = async (req, res, next) => {
        try {
            const { userId } = req.params;
            if (!userId) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ message: "User ID is required" });
            }
            const userDetails = await this._authService.getUserDetailsForAdmin(userId);
            res.status(HttpStatusCode.OK).json(userDetails);
        }
        catch (error) {
            next(error);
        }
    };
    searchResources = async (req, res, next) => {
        try {
            const query = req.query.query || "";
            const result = await this._authService.searchResources(query);
            res.status(HttpStatusCode.OK).json(result);
        }
        catch (error) {
            next(error);
        }
    };
};
AuthController = __decorate([
    injectable(),
    __param(0, inject(TYPES.AuthService)),
    __metadata("design:paramtypes", [Object])
], AuthController);
export { AuthController };
