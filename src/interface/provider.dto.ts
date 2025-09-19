import mongoose, { Schema, Types } from "mongoose";
import { ProviderStatus } from "../enums/provider.enum";
import { BookingStatus } from "../enums/booking.enum";

export interface Availability {
  day: string;
  startTime: string;
  endTime: string;
}

export interface IProviderRegisterRequest {
  fullName: string;
  phoneNumber: string;
  email: string;

  categoryId: string;
  serviceId: string;

  serviceLocation: string;
  serviceArea: string;
  experience: number;

  availability: Availability[];

  timeSlot: {
    startTime: string;
    endTime: string;
  };
  aadhaarIdProof: string;

  profilePhoto: string;

  userId: string;

  averageChargeRange?: string;
}

export interface IProviderForAdminResponce {
  id: string
  userId: string
  fullName: string;
  phoneNumber: string;
  email: string;
  serviceArea: string;
  profilePhoto: string;
  status: string;
  serviceName?: string;
  serviceOffered?: string[]

}

export interface IFeaturedProviders {
  id: string;
  userId: string;
  fullName: string;
  profilePhoto: string;

}

export interface IProviderProfile {
  aadhaarIdProof?: string;
  id: string;
  userId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  serviceId: string[];
  serviceLocation: string;
  serviceArea: string;
  profilePhoto: string;
  status: ProviderStatus;
  availability: Availability[];
  earnings: number;
  totalBookings: number;
  payoutPending: number;
  rating: number;
  isVerified: boolean
}

export interface ProviderFilterQuery {
  serviceId: Types.ObjectId;
  serviceArea?: { $regex: RegExp };
  experience?: { $gte: number };
  availability?: Availability[];
  price?: { $lte: number };
}

export interface IServiceAddPageResponse {
  id: string;
  name: string;
  parentId: string | null;

}

export interface IReviewsOfUser {
  userName?: string,
  userImg?: string,
  rating?: number
  review?: string,
}


export interface IBackendProvider {
  _id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  profilePhoto: string;
  serviceName?: string;
  serviceArea: string;
  experience: number;
  availability: Availability[];
  status: string;
  earnings: number;
  price: number;
  totalBookings: number;
  rating?: number;
  reviews?: IReviewsOfUser[];
}

export interface IProviderForChatListPage {
  id: string;
  bookingId?: string;
  name: string;
  profilePicture: string;
  location: string;
  isOnline: boolean;
  services: string;
  // completedJobs: number;
  lastMessage?: string;
  lastMessageAt?: Date | null;
}

export interface IDashboardResponse {
  id: string;
  service: string;
  client: string;
  status: BookingStatus;
  image: string;
  category: string;

}

export interface IRatingPoint {
  month: string;
  rating: number;
}

export interface IDashboardStatus {
  earnings: number;
  completedJobs: number;
  upcomingBookings: number;
  averageRating?: number;
  ratingHistory?: IRatingPoint[];
}

export interface ITopActiveProviders {
  _id: Types.ObjectId | string;
  fullName: string;
  totalBookings: number;
  profilePhoto: string;
  rating: number;
  reveiwCount?: number;
}

export interface IProviderDashboardRes {
  totalUsers: number;
  totalProviders: number;
  totalBookings: number;
  dailyBookings: {
    date: string;
    total: number;
  }[];
  monthlyRevenue: {
    month: string;
    total: number;
  }[];
  topActiveProviders: ITopActiveProviders[];
}