import { inject, injectable } from 'inversify';
import { IUserRepository } from '../../repositories/interface/IUserRepository';
import { RegisterRequestBody, VerifyOtpRequestBody, ResendOtpRequestBody, ForgotPasswordRequestBody, ResetPasswordRequestBody } from '../../types/auth';
import { generateOTP } from '../../utils/otpGenerator';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../utils/emailService';
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import TYPES from '../../di/type';
import { IAuthService } from '../interface/IAuthService';
import { CustomError } from '../../utils/CustomError';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;
const PASSWORD_RESET_EXPIRY_MINUTES = parseInt(process.env.PASSWORD_RESET_EXPIRY_MINUTES, 10) || 60;

@injectable()
export class AuthService implements IAuthService {
    private userRepository: IUserRepository;

    constructor(@inject(TYPES.UserRepository) userRepository: IUserRepository){
      this.userRepository = userRepository
    }

    public async registerUser(data: RegisterRequestBody): Promise<{ message: string; email: string }> {
        const { name, email, password, role } = data;

        let user = await this.userRepository.findByEmail(email);


        if (user && user.isVerified) {
            const error = new Error('User with this email already exists and is verified.');
            (error as any).statusCode = 400;
            throw error;
        }

        if (!user) {
            user = await this.userRepository.create({ name, email, password, role });
        } else {
            user.name = name;
            user.password = password;
            user.role = role || 'Customer';
            user.isVerified = false;
        }

        const otp = generateOTP();
        user.registrationOtp = otp;
        user.registrationOtpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        user.registrationOtpAttempts = 0;
        await this.userRepository.update(user);

        await sendVerificationEmail(email, otp);

        return {
            message: 'Registration successful! An OTP has been sent to your email for verification.',
            email: String(user.email),
        };
    }

    public async verifyOtp(data: VerifyOtpRequestBody): Promise<{ message: string }> {
        const { email, otp } = data;

        const user = await this.userRepository.findByEmail(email, true);

        if (!user) {
            const error = new Error('User not found or OTP session expired. Please register again.');
            (error as any).statusCode = 404;
            throw error;
        }

        if (user.isVerified) {
            return { message: 'Account already verified.' };
        }

        if (typeof user.registrationOtpAttempts === 'number' && user.registrationOtpAttempts >= MAX_OTP_ATTEMPTS) {
            const error = new Error(`Too many failed OTP attempts. Please request a new OTP.`);
            (error as any).statusCode = 403;
            throw error;
        }

        if (!user.registrationOtp || user.registrationOtp !== otp) {
            user.registrationOtpAttempts = (typeof user.registrationOtpAttempts === 'number' ? user.registrationOtpAttempts : 0) + 1;
            await this.userRepository.update(user);
            const error = new Error('Invalid OTP. Please try again.');
            (error as any).statusCode = 400;
            throw error;
        }

        if (!user.registrationOtpExpires || new Date() > user.registrationOtpExpires) {
            user.registrationOtp = undefined;
            user.registrationOtpExpires = undefined;
            user.registrationOtpAttempts = 0;
            await this.userRepository.update(user);
            const error = new Error('OTP has expired. Please request a new one.');
            (error as any).statusCode = 400;
            throw error;
        }

        user.isVerified = true;
        user.registrationOtp = undefined;
        user.registrationOtpExpires = undefined;
        user.registrationOtpAttempts = 0;
        await this.userRepository.update(user);

        return { message: 'Account successfully verified!' };
    }

    public async resendOtp(data: ResendOtpRequestBody): Promise<{ message: string }> {
        const { email } = data;

        const user = await this.userRepository.findByEmail(email, true);

        if (!user) {
            return { message: 'If an account with this email exists, a new OTP has been sent.' };
        }

        if (user.isVerified) {
            return { message: 'Account already verified. Please proceed to login.' };
        }

        if (user.registrationOtpExpires && user.registrationOtpExpires instanceof Date) {
            const timeSinceLastOtpSent = Date.now() - (user.registrationOtpExpires.getTime() - (OTP_EXPIRY_MINUTES * 60 * 1000));
            if (timeSinceLastOtpSent < RESEND_COOLDOWN_SECONDS * 1000) {
                const error = new Error(`Please wait ${RESEND_COOLDOWN_SECONDS - Math.floor(timeSinceLastOtpSent / 1000)} seconds before requesting another OTP.`);
                (error as any).statusCode = 429;
                throw error;
            }
        }

        const newOtp = generateOTP();
        user.registrationOtp = newOtp;
        user.registrationOtpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        user.registrationOtpAttempts = 0;

        await this.userRepository.update(user);

        await sendVerificationEmail(email, newOtp);

        return { message: 'A new OTP has been sent to your email.' };
    }

    public async login(email: string, password: string): Promise<{ user: { id: string; name: string; email: string; role: string, isVerified: boolean; profilePicture: string; }; token: string; refreshToken: string }> {
        const user = await this.userRepository.findByEmail(email, true);

        if (!user || !user.password) {
            throw new CustomError('Invalid credentials.', 401);
        }

        if (!user.isVerified) {
            throw new CustomError('Account not verified. Please verify your email or contact admin.', 403);
            
        }

        const isMatch = await bcrypt.compare(password, String(user.password));
        if (!isMatch) {
            throw new CustomError('Invalid credentials.', 401);
            
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d'})

        user.refreshToken = refreshToken
        await this.userRepository.update(user)

        return {
            user: {
                id: (user._id as { toString(): string }).toString(),
                name: user.name as string,
                email: user.email as string,
                role: (typeof user.role === 'string' ? user.role : 'Customer') as string,
                isVerified: Boolean(user.isVerified),
                profilePicture: typeof user.profilePicture === 'string' ? user.profilePicture : undefined,
            },
            token,
            refreshToken,
        };
    }

    public async requestPasswordReset(data: ForgotPasswordRequestBody): Promise<{ message: string }> {
        const { email } = data;

        const user = await this.userRepository.findByEmail(email);

        if (!user) {
            return { message: 'If an account with that email exists, a password reset link has been sent.' };
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

        await this.userRepository.update(user);

        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        await sendPasswordResetEmail(String(user.email), resetLink);

        return { message: 'A password reset link has been sent to your email.' };
    }

    public async resetPassword(data: ResetPasswordRequestBody): Promise<{ message: string }> {
        const { token, newPassword, confirmNewPassword } = data;

        if (newPassword !== confirmNewPassword) {
            const error = new Error('Passwords do not match.');
            (error as any).statusCode = 400;
            throw error;
        }

        const user = await this.userRepository.findByPasswordResetToken(token);

        if (!user) {
            const error = new Error('Invalid or expired password reset token.');
            (error as any).statusCode = 400;
            throw error;
        }

        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;

        await this.userRepository.update(user);

        return { message: 'Your password has been reset successfully.' };
    }

    public async googleAuthLogin(token: string): Promise<{user: { id: string; name: string; email: string; role: string };token: string;refreshToken: string;}> {
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email || !payload.name || !payload.sub) {
            const error = new Error('Invalid Google token payload.');
            (error as any).statusCode = 400;
            throw error;
        }
        const { email, name, sub: googleId } = payload;

        let user = await this.userRepository.findByGoogleId(googleId);

        if (!user) {
            user = await this.userRepository.findByEmail(email);

            if (user) {
                if (!user.googleId) {
                    user.googleId = googleId;
                    user.provider = 'google';
                    await this.userRepository.update(user);
                }
            } else {
                user = await this.userRepository.create({
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

        if (!process.env.JWT_SECRET) {
            const error = new Error('JWT_SECRET is not defined in environment variables.');
            (error as any).statusCode = 500;
            throw error;
        }


        const jwtToken = jwt.sign({ id: user._id, role: user.role },process.env.JWT_SECRET,{ expiresIn: '1h' });

        const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d'})

        user.refreshToken = refreshToken
        await this.userRepository.update(user)

        return {
            user: {
                id: (user._id as { toString(): string }).toString(),
                name: user.name as string,
                email: user.email as string,
                role: (typeof user.role === 'string' ? user.role : 'Customer') as string,
            },
            token: jwtToken,
            refreshToken,
        };
    }

    public async createRefreshToken(refresh_token: string): Promise<{newToken: string}> {
        try {
            const decoded = jwt.verify(refresh_token,process.env.REFRESH_TOKEN_SECRET as string) as JwtPayload & { id: string };

            const user = await this.userRepository.findById(decoded.id);
            if (!user || user.refreshToken !== refresh_token) {
            throw new CustomError('Refresh token not found in database. Please re-login', 403);
            }
            const newToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET as string,{ expiresIn: '1h' });
            return { newToken };
        } catch (err) {
            throw new CustomError('Refresh token invalid or expired. Please re-login',403);
        
        }
    }

    public async getUser(token: string): Promise<{ id: string; name: string; email: string; role: string, isVerified: boolean, profilePicture?: string }> {

        if (!token) {
            throw new CustomError('service No token provided.',401);
        }
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            throw new CustomError('Invalid token.', 401);
        }

        const user = await this.userRepository.findById(decoded.id);

        if (!user) {
            const error = new Error('User not found.');
            (error as any).statusCode = 404;
            throw error;
        }


        return {
            id: (user._id as { toString(): string }).toString(),
            name: user.name as string,
            email: user.email as string,
            role: (typeof user.role === 'string' ? user.role : 'Customer') as string,
            isVerified: Boolean(user.isVerified),
            profilePicture: typeof user.profilePicture === 'string' ? user.profilePicture : undefined,
        };
    }

    public async updateProfile(token: string, data: { name: string; email: string; profilePicture?: string }): Promise<{ id: string; name: string; email: string; profilePicture?: string }> {
        if (!token) {
            const error = new Error('No token provided.');
            (error as any).statusCode = 401;
            throw error;
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            const err = new Error('Invalid token.');
            (err as any).statusCode = 401;
            throw err;
        }

        const user = await this.userRepository.findById(decoded.id);
        if (!user) {
            const error = new Error('User not found.');
            (error as any).statusCode = 404;
            throw error;
        }

        user.name = data.name || user.name;
        user.email = data.email || user.email;
        if (data.profilePicture) {
            user.profilePicture = data.profilePicture;
        }

        await this.userRepository.update(user);

        return {
            id: (user._id as { toString(): string }).toString(),
            name: user.name as string,
            email: user.email as string,
            profilePicture: typeof user.profilePicture === 'string' ? user.profilePicture : undefined,
        };
    }

    public async getUserWithAllDetails(): Promise<Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        isVerified: boolean;
        profilePicture?: string;
    }>> {
        const users = await this.userRepository.findAllUsers();

        if (!users || users.length === 0) {
            const error = new Error('No users found.');
            (error as any).statusCode = 404;
            throw error;
        }

        return users.map(user => ({
            id: (user._id as { toString(): string }).toString(),
            name: user.name as string,
            email: user.email as string,
            role: typeof user.role === 'string' ? user.role : 'Customer',
            isVerified: Boolean(user.isVerified),
            profilePicture: typeof user.profilePicture === 'string' ? user.profilePicture : undefined,
        }));
    }

    public async updateUser(id: string): Promise<{ id: string; name: string; email: string; role: string, isVerified: boolean, profilePicture?: string }> {
        const user = await this.userRepository.findById(id);

        if (!user) {
            const error = new Error('User not found.');
            (error as any).statusCode = 404;
            throw error;
        }

        user.isVerified = !user.isVerified;

        await this.userRepository.update(user);

        return {
            id: (user._id as { toString(): string }).toString(),
            name: user.name as string,
            email: user.email as string,
            role: (typeof user.role === 'string' ? user.role : 'Customer') as string,
            isVerified: Boolean(user.isVerified),
            profilePicture: typeof user.profilePicture === 'string' ? user.profilePicture : undefined,
        };
    }

    public async logout(refreshToken: string | undefined): Promise<{ message: string }> {
        if (!refreshToken) {
            return { message: 'No refresh token provided for logout.' };
        }

        try {
            const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string) as JwtPayload & { id: string };

            const user = await this.userRepository.findById(decoded.id);

            if (user && user.refreshToken === refreshToken) {
                user.refreshToken = null; 
                await this.userRepository.update(user);
                return { message: 'Logged out successfully and refresh token invalidated.' };
            } else {
                return { message: 'Refresh token not found or already invalidated in database. Logout complete.' };
            }

        } catch (error) {
            console.error('Logout failed due to refresh token error:', error);
            return { message: 'Logout process complete (refresh token was invalid or expired).' };
        }
    }


}

