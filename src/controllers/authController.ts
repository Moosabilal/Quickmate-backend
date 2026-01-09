import { inject, injectable } from "inversify";
import { type Request, type Response, type NextFunction } from "express";
import { type IAuthService } from "../services/interface/IAuthService.js";
import {
  type RegisterRequestBody,
  type VerifyOtpRequestBody,
  type ResendOtpRequestBody,
  type ForgotPasswordRequestBody,
  type ResetPasswordRequestBody,
} from "../interface/auth.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";
import TYPES from "../di/type.js";
import { type AuthRequest } from "../middleware/authMiddleware.js";
import { HttpStatusCode } from "../enums/HttpStatusCode.js";
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  emailOnlySchema,
  resetPasswordSchema,
  googleLoginSchema,
  contactUsSchema,
  updateProfileSchema,
} from "../utils/validations/auth.validation.js";
import { CustomError } from "../utils/CustomError.js";

@injectable()
export class AuthController {
  private _authService: IAuthService;
  constructor(@inject(TYPES.AuthService) authService: IAuthService) {
    this._authService = authService;
  }

  public register = async (
    req: Request<Record<string, never>, unknown, RegisterRequestBody>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validatedBody = registerSchema.parse(req.body);
      const response = await this._authService.registerUser(validatedBody);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction) => {
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
    } catch (error) {
      next(error);
    }
  };

  public verifyOtp = async (
    req: Request<Record<string, never>, unknown, VerifyOtpRequestBody>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validatedBody = verifyOtpSchema.parse(req.body);
      const response = await this._authService.verifyOtp(validatedBody);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  public resendOtp = async (
    req: Request<Record<string, never>, unknown, ResendOtpRequestBody>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validatedBody = emailOnlySchema.parse(req.body);
      const response = await this._authService.resendOtp(validatedBody);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  public forgotPassword = async (
    req: Request<Record<string, never>, unknown, ForgotPasswordRequestBody>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validatedBody = emailOnlySchema.parse(req.body);
      const response = await this._authService.requestPasswordReset(validatedBody);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  public resetPassword = async (
    req: Request<Record<string, never>, unknown, ResetPasswordRequestBody>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validatedBody = resetPasswordSchema.parse(req.body);
      const response = await this._authService.resetPassword(validatedBody);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  public googleLogin = async (
    req: Request<Record<string, never>, unknown, { token: string }>,
    res: Response,
    next: NextFunction,
  ) => {
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
    } catch (error) {
      next(error);
    }
  };

  public refreshToken = async (req: Request, res: Response, next: NextFunction) => {
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
    } catch (error) {
      next(error);
    }
  };

  public contactUsEmail = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name, email, message } = contactUsSchema.parse(req.body);
      const response = await this._authService.sendSubmissionEmail(name, email, message);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies.token;
      const user = await this._authService.getUser(token);
      res.status(HttpStatusCode.OK).json(user);
    } catch (error) {
      next(error);
    }
  };

  public updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email } = updateProfileSchema.parse(req.body);
      const token = req.cookies.token;
      const profilePicturePath = req.file?.path;
      let profilePicture: string | undefined | null;

      if (profilePicturePath) {
        profilePicture = await uploadToCloudinary(profilePicturePath);
      } else if (req.body.iconUrl === "") {
        profilePicture = null;
      } else if (req.body.iconUrl !== undefined) {
        profilePicture = req.body.iconUrl;
      }

      const updatedUser = await this._authService.updateProfile(token, {
        name,
        email,
        profilePicture,
      });
      res.status(HttpStatusCode.OK).json(updatedUser);
    } catch (error) {
      next(error);
    }
  };

  public generateOtp = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const { email } = req.body;
      const response = await this._authService.generateOtp(userId, email);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getUserWithRelated = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const status = (req.query.status as string) || "All";
      const userWithDetails = await this._authService.getUserWithAllDetails(page, limit, search, status);
      res.status(HttpStatusCode.OK).json(userWithDetails);
    } catch (error) {
      next(error);
    }
  };

  public updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.userId;
      const reason = req.body.reason ? (req.body.reason as string) : undefined;
      const updatedUser = await this._authService.updateUser(userId, reason);
      res.status(HttpStatusCode.OK).json(updatedUser);
    } catch (error) {
      next(error);
    }
  };

  public logout = async (req: Request, res: Response, next: NextFunction) => {
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
    } catch (error) {
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

  public getAllDataForChatBot = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const response = await this._authService.getAllDataForChatBot(userId);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getUserDetailsForAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(HttpStatusCode.BAD_REQUEST).json({ message: "User ID is required" });
      }

      const userDetails = await this._authService.getUserDetailsForAdmin(userId);

      res.status(HttpStatusCode.OK).json(userDetails);
    } catch (error) {
      next(error);
    }
  };

  public searchResources = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (req.query.query as string) || "";
      const result = await this._authService.searchResources(query);
      res.status(HttpStatusCode.OK).json(result);
    } catch (error) {
      next(error);
    }
  };
}
