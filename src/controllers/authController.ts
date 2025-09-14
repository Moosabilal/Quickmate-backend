
import { inject, injectable } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { IAuthService } from '../services/interface/IAuthService';
import { RegisterRequestBody, VerifyOtpRequestBody, ResendOtpRequestBody, ForgotPasswordRequestBody, ResetPasswordRequestBody } from '../interface/auth.dto';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import TYPES from '../di/type';
import { AuthRequest } from '../middleware/authMiddleware';
import { HttpStatusCode } from '../enums/HttpStatusCode';

@injectable()
export class AuthController {
  private _authService: IAuthService
  constructor(@inject(TYPES.AuthService) authService: IAuthService) {
    this._authService = authService
  }


  public register = async (req: Request<{}, {}, RegisterRequestBody>, res: Response, next: NextFunction) => {
    try {
      const response = await this._authService.registerUser(req.body);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  }


  public login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await this._authService.login(email, password);

      let token = result.token
      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000 //1h

      })
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 //7d

      })
      res.status(HttpStatusCode.OK).json(result);
    } catch (error) {
      next(error);
    }
  }


  public verifyOtp = async (req: Request<{}, {}, VerifyOtpRequestBody>, res: Response, next: NextFunction) => {
    try {
      const response = await this._authService.verifyOtp(req.body);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  }


  public resendOtp = async (req: Request<{}, {}, ResendOtpRequestBody>, res: Response, next: NextFunction) => {
    try {
      const response = await this._authService.resendOtp(req.body);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  public forgotPassword = async (req: Request<{}, {}, ForgotPasswordRequestBody>, res: Response, next: NextFunction) => {
    try {
      const response = await this._authService.requestPasswordReset(req.body);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  }


  public resetPassword = async (req: Request<{}, {}, ResetPasswordRequestBody>, res: Response, next: NextFunction) => {
    try {
      const response = await this._authService.resetPassword(req.body);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  }


  public googleLogin = async (req: Request<{}, {}, { token: string }>, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;
      const response = await this._authService.googleAuthLogin(token);
      let jwtToken = response.token
      res.cookie('token', jwtToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 //1h

      })
      res.cookie('refreshToken', response.refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 //7d

      })
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  public refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies.refreshToken
      if (!refresh_token) {
        res.status(401).json({ message: 'Refresh token not found' })
        return
      }
      const response = await this._authService.createRefreshToken(refresh_token)
      res.cookie('token', response.newToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 //7d
      })

      res.status(HttpStatusCode.OK).json(response);

    } catch (error) {
      next(error)
    }
  }

  public contactUsEmail = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const {name, email, message} = req.body
      const response = await this._authService.sendSubmissionEmail(name, email, message);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  }


  public getUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies.token
      const user = await this._authService.getUser(token);
      res.status(HttpStatusCode.OK).json(user);
    } catch (error) {
      next(error);
    }
  }


  public updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies.token
      const profilePicturePath = req.file?.path;
      let profilePicture: string | undefined | null;

      if (profilePicturePath) {
        const fullUrl = await uploadToCloudinary(profilePicturePath);
        const baseUrl = process.env.CLOUDINARY_BASE_URL;
        profilePicture = fullUrl.replace(baseUrl, '');
      } else if (req.body.iconUrl === '') {
        profilePicture = null;
      } else if (req.body.iconUrl !== undefined) {
        profilePicture = req.body.iconUrl;
      }
      const { name, email } = req.body;
      const updatedUser = await this._authService.updateProfile(token, { name, email, profilePicture });
      res.status(HttpStatusCode.OK).json(updatedUser);
    } catch (error) {
      next(error);
    }
  }


  public getUserWithRelated = async (req: Request, res: Response, next: NextFunction) => {
    try {

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || '';
      const status = req.query.status as string || "All"
      const userWithDetails = await this._authService.getUserWithAllDetails(page, limit, search, status);
      res.status(HttpStatusCode.OK).json(userWithDetails);
    } catch (error) {
      next(error);
    }
  }

  public updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.userId;
      const updatedUser = await this._authService.updateUser(userId);
      res.status(HttpStatusCode.OK).json(updatedUser);
    } catch (error) {
      next(error);
    }
  }

  public logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies.refreshToken;

      await this._authService.logout(refreshToken);

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

      res.status(HttpStatusCode.OK).json({ message: 'Logged out successfully' });
    } catch (error) {
      res.cookie('token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', expires: new Date(0) });
      res.cookie('refreshToken', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', expires: new Date(0) });
      next(error);
    }
  }

  public getAllDataForChatBot = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const response = await this._authService.getAllDataForChatBot(userId)
      res.status(HttpStatusCode.OK).json(response)
    } catch (error) {
      next(error)
    }
  }

  




}