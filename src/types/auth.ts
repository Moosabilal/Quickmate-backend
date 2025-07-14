// export interface IUser {
//   _id?: string; 
//   name: string;
//   email: string;
//   password?: string; 
//   role?: 'Customer' | 'ServiceProvider' | 'Admin';
//   isVerified: boolean;
//   profilePicture: string; 
//   googleId?: string; 
//   provider?: 'local' | 'google';
//   registrationOtp?: string;
//   registrationOtpExpires?: Date;
//   registrationOtpAttempts?: number;
//   createdAt?: Date;
//   updatedAt?: Date;
// }
export interface RegisterRequestBody {
  name: string;
  email: string;
  password: string;
  role?: 'Customer' | 'ServiceProvider' | 'Admin';
}
export interface VerifyOtpRequestBody {
  email: string;
  otp: string;
}
export interface ResendOtpRequestBody {
  email: string;
}

export interface AuthSuccessResponse {
  message: string;
  email?: string; 
}

export interface AuthErrorResponse {
  message: string;
  errors?: any; 
}

export interface ResetPasswordRequestBody {
  token: string; 
  newPassword: string;
  confirmNewPassword: string;
}

export interface ResetPasswordSuccessResponse {
  message: string;
}

export interface ForgotPasswordRequestBody {
  email: string;
}

export interface ForgotPasswordSuccessResponse {
  message: string;
  email?: string; 
}

