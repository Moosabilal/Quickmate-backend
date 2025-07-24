
import { inject, injectable } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { IAuthService } from '../services/interface/IAuthService';
import { RegisterRequestBody, VerifyOtpRequestBody, ResendOtpRequestBody, ForgotPasswordRequestBody, ResetPasswordRequestBody } from '../types/auth';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import TYPES from '../di/type';
import { AuthRequest } from '../middleware/authMiddleware';

@injectable()
export class AuthController {
  private authService: IAuthService
  constructor(@inject(TYPES.AuthService) authService: IAuthService) {
    this.authService = authService
  }


  public register = async (req: Request<{}, {}, RegisterRequestBody>, res: Response, next: NextFunction) => {
    try {
      const response = await this.authService.registerUser(req.body);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }


  public login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);

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
      res.status(200).json(result);
    } catch (error) {
      console.log('the error is comign', error)
      next(error);
    }
  }


  public verifyOtp = async (req: Request<{}, {}, VerifyOtpRequestBody>, res: Response, next: NextFunction) => {
    try {
      const response = await this.authService.verifyOtp(req.body);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }


  public resendOtp = async (req: Request<{}, {}, ResendOtpRequestBody>, res: Response, next: NextFunction) => {
    try {
      const response = await this.authService.resendOtp(req.body);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  public forgotPassword = async (req: Request<{}, {}, ForgotPasswordRequestBody>, res: Response, next: NextFunction) => {
    try {
      const response = await this.authService.requestPasswordReset(req.body);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }


  public resetPassword = async (req: Request<{}, {}, ResetPasswordRequestBody>, res: Response, next: NextFunction) => {
    try {
      const response = await this.authService.resetPassword(req.body);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }


  public googleLogin = async (req: Request<{}, {}, { token: string }>, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;
      const response = await this.authService.googleAuthLogin(token);
      let jwtToken = response.token
      res.cookie('token', jwtToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 //7d

      })
      res.cookie('refreshToken', response.refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 //7d

      })
      res.status(200).json(response);
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
      const response = await this.authService.createRefreshToken(refresh_token)
      res.cookie('token', response.newToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 //7d
      })

      res.status(200).json(response);

    } catch (error) {
      next(error)
    }
  }

  public contactUsEmail = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const {name, email, message} = req.body
      const response = await this.authService.sendSubmissionEmail(name, email, message);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }


  public getUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies.token
      const user = await this.authService.getUser(token);
      res.status(200).json(user);
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
      const updatedUser = await this.authService.updateProfile(token, { name, email, profilePicture });
      res.status(200).json(updatedUser);
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
      const userWithDetails = await this.authService.getUserWithAllDetails(page, limit, search, status);
      res.status(200).json(userWithDetails);
    } catch (error) {
      next(error);
    }
  }

  public updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.userId;
      const updatedUser = await this.authService.updateUser(userId);
      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  }

  public logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies.refreshToken;

      await this.authService.logout(refreshToken);

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

      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      res.cookie('token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', expires: new Date(0) });
      res.cookie('refreshToken', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', expires: new Date(0) });
      next(error);
    }
  }




}