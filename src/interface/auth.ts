import { type BookingStatus } from "../enums/booking.enum.js";
import { type Roles } from "../enums/userRoles.js";

export interface ILoginResponseDTO {
  id: string;
  name: string;
  email: string;
  role: Roles;
  isVerified: boolean;
  profilePicture?: string;
}

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

export interface ResetPasswordRequestBody {
  token: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ResetPasswordSuccessResponse {
  message: string;
}

export interface ForgotPasswordRequestBody {
  email?: string;
  currentPassword?: string;
}

export interface ForgotPasswordSuccessResponse {
  message: string;
  email?: string;
}

export interface IBookingDetailsForAdmin {
  id: string;
  providerName: string;
  service: string;
  bookingDate: string;
  serviceDate: string;
  status: BookingStatus;
}

export interface IUserDetailsResponse {
  id: string;
  name: string;
  avatarUrl: string;
  email: string;
  phone: string;
  registrationDate: string;
  lastLogin: string;
  totalBookings: number;
  isActive: boolean;
  bookingStats: {
    completed: number;
    canceled: number;
    pending: number;
  };
  bookingHistory: IBookingDetailsForAdmin[];
}

export interface IUserListFilter {
  search?: string;
  status?: "Active" | "Inactive" | "All" | string;
  role?: string;
}
