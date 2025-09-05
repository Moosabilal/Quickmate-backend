import { inject, injectable } from 'inversify';
import { IUserRepository } from '../../repositories/interface/IUserRepository';
import { RegisterRequestBody, VerifyOtpRequestBody, ResendOtpRequestBody, ForgotPasswordRequestBody, ResetPasswordRequestBody, AuthSuccessResponse } from '../../dto/auth.dto';
import { generateOTP } from '../../utils/otpGenerator';
import { sendVerificationEmail, sendPasswordResetEmail, sendContactUsEmail } from '../../utils/emailService';
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import TYPES from '../../di/type';
import { IAuthService } from '../interface/IAuthService';
import { CustomError } from '../../utils/CustomError';
import { ErrorMessage } from '../../enums/ErrorMessage';
import { HttpStatusCode } from '../../enums/HttpStatusCode';
import logger from '../../logger/logger';
import { IBooking } from '../../models/Booking';
import { IBookingRepository } from '../../repositories/interface/IBookingRepository';
import { IProviderRepository } from '../../repositories/interface/IProviderRepository';
import { IServiceRepository } from '../../repositories/interface/IServiceRepository';
import { ICategoryRepository } from '../../repositories/interface/ICategoryRepository';
import { ICategory } from '../../models/Categories';
import { IService } from '../../models/Service';
import { IProvider } from '../../models/Providers';


const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;
const PASSWORD_RESET_EXPIRY_MINUTES = parseInt(process.env.PASSWORD_RESET_EXPIRY_MINUTES, 10) || 60;

@injectable()
export class AuthService implements IAuthService {
    private _userRepository: IUserRepository;
    private _bookingRepository: IBookingRepository;
    private _providerRepository: IProviderRepository;
    private _categoryRepository: ICategoryRepository;
    private _serviceRepository: IServiceRepository;

    constructor(@inject(TYPES.UserRepository) userRepository: IUserRepository,
        @inject(TYPES.BookingRepository) bookingRepository: IBookingRepository,
        @inject(TYPES.ProviderRepository) providerRepository: IProviderRepository,
        @inject(TYPES.CategoryRepository) categoryRepository: ICategoryRepository,
        @inject(TYPES.ServiceRepository) serviceRepository: IServiceRepository,
    ) {
        this._userRepository = userRepository
        this._bookingRepository = bookingRepository
        this._providerRepository = providerRepository
        this._categoryRepository = categoryRepository
        this._serviceRepository = serviceRepository
    }

    public async registerUser(data: RegisterRequestBody): Promise<AuthSuccessResponse> {
        const { name, email, password } = data;

        let user = await this._userRepository.findByEmail(email);


        if (user && user.isVerified) {
            throw new CustomError(ErrorMessage.USER_ALREADY_EXISTS, HttpStatusCode.CONFLICT)
        }

        if (!user) {
            user = await this._userRepository.create({ name, email, password });
        } else {
            user.name = name;
            user.password = password;
            user.isVerified = false;
        }


        const otp = generateOTP();
        user.registrationOtp = otp;
        user.registrationOtpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        user.registrationOtpAttempts = 0;
        await this._userRepository.update(user._id.toString(), user);

        await sendVerificationEmail(email, otp);

        return {
            message: 'Registration successful! An OTP has been sent to your email for verification.',
            email: String(user.email),
        };
    }

    public async verifyOtp(data: VerifyOtpRequestBody): Promise<{ message: string }> {
        const { email, otp } = data;

        const user = await this._userRepository.findByEmail(email, true);

        if (!user) {
            throw new CustomError(ErrorMessage.USER_NOT_FOUND, HttpStatusCode.NOT_FOUND)
        }

        if (user.isVerified) {
            return { message: 'Account already verified.' };
        }

        if (typeof user.registrationOtpAttempts === 'number' && user.registrationOtpAttempts >= MAX_OTP_ATTEMPTS) {
            throw new CustomError(`Too many failed OTP attempts. Please request a new OTP.`, HttpStatusCode.FORBIDDEN);

        }

        if (!user.registrationOtp || user.registrationOtp !== otp) {
            user.registrationOtpAttempts = (typeof user.registrationOtpAttempts === 'number' ? user.registrationOtpAttempts : 0) + 1;
            await this._userRepository.update(user._id.toString(), user);
            const error = new Error('Invalid OTP. Please try again.');
            (error as any).statusCode = 400;
            throw error;
        }

        if (!user.registrationOtpExpires || new Date() > user.registrationOtpExpires) {
            user.registrationOtp = undefined;
            user.registrationOtpExpires = undefined;
            user.registrationOtpAttempts = 0;
            await this._userRepository.update(user._id.toString(), user);
            throw new CustomError('OTP has expired. Please request a new one.', HttpStatusCode.BAD_REQUEST);
        }

        user.isVerified = true;
        user.registrationOtp = undefined;
        user.registrationOtpExpires = undefined;
        user.registrationOtpAttempts = 0;
        await this._userRepository.update(user._id.toString(), user);

        return { message: 'Account successfully verified!' };
    }

    public async resendOtp(data: ResendOtpRequestBody): Promise<{ message: string }> {
        const { email } = data;

        const user = await this._userRepository.findByEmail(email, true);

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

        await this._userRepository.update(user._id.toString(), user);

        await sendVerificationEmail(email, newOtp);

        return { message: 'A new OTP has been sent to your email.' };
    }

    public async login(email: string, password: string): Promise<{ user: { id: string; name: string; email: string; role: string, isVerified: boolean; profilePicture: string; }; token: string; refreshToken: string }> {
        const user = await this._userRepository.findByEmail(email, true);

        if (!user || !user.password) {
            throw new CustomError('Invalid Credentails', HttpStatusCode.UNAUTHORIZED);

        }

        if (!user.isVerified) {
            throw new CustomError(`Account not verified. Please verify your email or contact admin.`, HttpStatusCode.FORBIDDEN);

        }

        const isMatch = await bcrypt.compare(password, String(user.password));
        if (!isMatch) {
            throw new CustomError(ErrorMessage.INVALID_CREDENTIALS, HttpStatusCode.UNAUTHORIZED)

        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' })

        user.refreshToken = refreshToken
        await this._userRepository.update(user._id.toString(), user)

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
        const { email, currentPassword } = data;
        const user = await this._userRepository.findByEmail(email, true);

        if (!user) {
            return { message: 'If an account with that email exists, a password reset link has been sent.' };
        }

        if (currentPassword) {

            const isMatch = await bcrypt.compare(currentPassword, String(user.password));
            if (!isMatch) {
                throw new CustomError(ErrorMessage.INVALID_CREDENTIALS, HttpStatusCode.UNAUTHORIZED)
            }

        }


        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

        await this._userRepository.update(user._id.toString(), user);

        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        logger.info('the reset link', resetLink)

        await sendPasswordResetEmail(String(user.email), resetLink);

        return { message: 'A password reset link has been sent to your email.' };
    }

    public async resetPassword(data: ResetPasswordRequestBody): Promise<{ message: string }> {
        const { token, newPassword, confirmNewPassword } = data;

        if (newPassword !== confirmNewPassword) {
            throw new CustomError('Passwords do not match.', HttpStatusCode.BAD_REQUEST);

        }

        const user = await this._userRepository.findByPasswordResetToken(token);

        if (!user) {
            throw new CustomError('Invalid or expired password reset token.', HttpStatusCode.BAD_REQUEST);
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await this._userRepository.update(user._id.toString(), {
            password: hashedPassword,
            passwordResetToken: undefined,
            passwordResetExpires: undefined,
        });

        return { message: 'Your password has been reset successfully.' };
    }

    // public async verifyPassword(id: string, currentPassword: string): Promise<{ message: string }> {
    //     const user = await this.userRepository.findById(id);
    //     console.log('the user is', user)

    //     if (!user || !user.password) {
    //         throw new CustomError(ErrorMessage.USER_NOT_FOUND, HttpStatusCode.NOT_FOUND);
    //     }

    //     const isMatch = await bcrypt.compare(currentPassword, String(user.password));
    //     if (!isMatch) {
    //         throw new CustomError(ErrorMessage.INVALID_CREDENTIALS, HttpStatusCode.UNAUTHORIZED)

    //     }

    //     return { message: 'Password verified successfully.' };

    // }

    public async googleAuthLogin(token: string): Promise<{ user: { id: string; name: string; email: string; role: string }; token: string; refreshToken: string; }> {
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email || !payload.name || !payload.sub) {
            throw new CustomError('Invalid Google token payload.', HttpStatusCode.BAD_REQUEST);
        }
        const { email, name, sub: googleId } = payload;

        let user = await this._userRepository.findByGoogleId(googleId);

        if (!user) {
            user = await this._userRepository.findByEmail(email);

            if (user) {
                if (!user.googleId) {
                    user.googleId = googleId;
                    user.provider = 'google';
                    await this._userRepository.update(user._id.toString(), user);
                }
            } else {
                user = await this._userRepository.create({
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


        const jwtToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

        const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' })

        user.refreshToken = refreshToken
        await this._userRepository.update(user._id.toString(), user)

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

    public async createRefreshToken(refresh_token: string): Promise<{ newToken: string }> {
        try {
            const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET as string) as JwtPayload & { id: string };

            const user = await this._userRepository.findById(decoded.id);
            if (!user || user.refreshToken !== refresh_token) {
                throw new CustomError(ErrorMessage.MISSING_TOKEN, HttpStatusCode.FORBIDDEN);
            }
            const newToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
            return { newToken };
        } catch (err) {
            throw new CustomError(ErrorMessage.INVALID_REFRESH_TOKEN, HttpStatusCode.FORBIDDEN);

        }
    }

    public async sendSubmissionEmail(name: string, email: string, message: string): Promise<{ message: string }> {
        try {
            await sendContactUsEmail(name, email, message)
            return { message: "Email sent successfully" }
        } catch (error) {
            throw new CustomError(ErrorMessage.INTERNAL_ERROR, HttpStatusCode.INTERNAL_SERVER_ERROR)
        }
    }


    public async getUser(token: string): Promise<{ id: string; name: string; email: string; role: string, isVerified: boolean, profilePicture?: string }> {

        if (!token) {
            throw new CustomError(ErrorMessage.MISSING_TOKEN, HttpStatusCode.UNAUTHORIZED);
        }
        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
        } catch (error) {
            throw new Error('Invalid token.');
        }

        const user = await this._userRepository.findById(decoded.id);

        if (!user) {
            throw new CustomError(ErrorMessage.USER_NOT_FOUND, HttpStatusCode.NOT_FOUND);
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
            throw new CustomError(ErrorMessage.MISSING_TOKEN, HttpStatusCode.UNAUTHORIZED);
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            throw new CustomError(ErrorMessage.INVALID_TOKEN, HttpStatusCode.UNAUTHORIZED);
        }

        const user = await this._userRepository.findById(decoded.id);
        if (!user) {
            throw new CustomError(ErrorMessage.USER_NOT_FOUND, HttpStatusCode.NOT_FOUND);
        }

        user.name = data.name || user.name;
        user.email = data.email || user.email;
        if (data.profilePicture) {
            user.profilePicture = data.profilePicture;
        }

        const updatedUser = await this._userRepository.update(user._id.toString(), user);
        const { } = updatedUser
        return {
            id: (user._id as { toString(): string }).toString(),
            name: user.name as string,
            email: user.email as string,
            profilePicture: typeof user.profilePicture === 'string' ? user.profilePicture : undefined,
        };
    }

    public async getUserWithAllDetails(page: number, limit: number, search: string, status: string): Promise<{
        users: Array<{
            id: string;
            name: string;
            email: string;
            role: string;
            isVerified: boolean;
            profilePicture?: string;
        }>;
        total: number;
        totalPages: number;
        currentPage: number;
    }> {
        const skip = (page - 1) * limit;

        const filter: any = {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ],
        };

        if (status && status !== 'All') {
            if (status === 'Active') {
                filter.isVerified = true;
            } else if (status === 'Inactive') {
                filter.isVerified = false;
            }
        }

        const [users, total] = await Promise.all([
            this._userRepository.findUsersWithFilter(filter, skip, limit),
            this._userRepository.countUsers(filter),
        ]);

        if (!users || users.length === 0) {
            throw new CustomError(ErrorMessage.USER_NOT_FOUND, HttpStatusCode.NOT_FOUND);

        }

        const mappedUsers = users.map(user => ({
            id: user._id.toString(),
            name: user.name as string,
            email: user.email as string,
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
    }

    public async updateUser(id: string): Promise<{ id: string; name: string; email: string; role: string, isVerified: boolean, profilePicture?: string }> {
        const user = await this._userRepository.findById(id);

        if (!user) {
            throw new CustomError(ErrorMessage.USER_NOT_FOUND, HttpStatusCode.NOT_FOUND);
        }

        user.isVerified = !user.isVerified;

        await this._userRepository.update(user._id.toString(), user);

        return {
            id: (user._id as { toString(): string }).toString(),
            name: user.name as string,
            email: user.email as string,
            role: (typeof user.role === 'string' ? user.role : 'Customer') as string,
            isVerified: Boolean(user.isVerified),
            profilePicture: typeof user.profilePicture === 'string' ? user.profilePicture : undefined,
        };
    }

    getAllDataForChatBot = async (userId: string): Promise<{ categories: ICategory[]; services: IService[]; providers: IProvider[]; bookings: IBooking[] }> => {

        const user = await this._userRepository.findById(userId);
        if (!user) {
            throw new CustomError(ErrorMessage.USER_NOT_FOUND, HttpStatusCode.NOT_FOUND);
        }
        const bookings = await this._bookingRepository.findAll({ userId });
        const providers = await this._providerRepository.findAll();
        const categories = await this._categoryRepository.getAllCategories();
        const services = await this._serviceRepository.findAll();

        return { categories, services, providers, bookings };

    }

    public async logout(refreshToken: string | undefined): Promise<{ message: string }> {
        if (!refreshToken) {
            return { message: 'No refresh token provided for logout.' };
        }

        try {
            const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string) as JwtPayload & { id: string };

            const user = await this._userRepository.findById(decoded.id);

            if (user && user.refreshToken === refreshToken) {
                user.refreshToken = null;
                await this._userRepository.update(user._id.toString(), user);
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

