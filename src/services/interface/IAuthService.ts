import { ForgotPasswordRequestBody, RegisterRequestBody, ResendOtpRequestBody, ResetPasswordRequestBody, VerifyOtpRequestBody } from "../../types/auth";

export interface IAuthService {
  registerUser(data: RegisterRequestBody): Promise<{ message: string, email: string }>;
  verifyOtp(data: VerifyOtpRequestBody): Promise<{ message: string }>;
  resendOtp(data: ResendOtpRequestBody): Promise<{ message: string }>;
  login(email: string, password: string): Promise<{ user: { id: string; name: string; email: string; role: string, isVerified: boolean; profilePicture: string; }; token: string; refreshToken: string }>;
  requestPasswordReset(data: ForgotPasswordRequestBody): Promise<{ message: string }>;
  resetPassword(data: ResetPasswordRequestBody): Promise<{ message: string }>;
  googleAuthLogin(token: string): Promise<{ user: { id: string; name: string; email: string; role: string }; token: string; refreshToken: string }>;
  createRefreshToken(refresh_token: string): Promise<{ newToken: string }>;
  sendSubmissionEmail(name: string, email: string, message: string): Promise<{message: string}>
  getUser(token: string): Promise<{ id: string; name: string; email: string; role: string, isVerified: boolean, profilePicture?: string }>;
  updateProfile(token: string, data: { name: string; email: string; profilePicture?: string }): Promise<{ id: string; name: string; email: string; profilePicture?: string }>;
  getUserWithAllDetails(page: number, limit: number, search: string, status: string): Promise<{
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
  }>
  updateUser(id: string): Promise<{ id: string; name: string; email: string; role: string, isVerified: boolean, profilePicture?: string }>;
  logout(refreshToken: string | undefined): Promise<{ message: string }>;


}