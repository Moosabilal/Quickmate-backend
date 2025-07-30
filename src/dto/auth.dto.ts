export interface RegisterRequestBody {
  name: string;
  email: string;
  password: string;
}

export interface AuthSuccessResponse {
  message: string;
  email?: string; 
}

export interface VerifyOtpRequestBody {
  email: string;
  otp: string;
}
export interface ResendOtpRequestBody {
  email: string;
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

