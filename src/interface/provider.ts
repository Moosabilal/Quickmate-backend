import mongoose, { Schema, Types } from "mongoose";
import { ProviderStatus } from "../enums/provider.enum";
import { BookingStatus } from "../enums/booking.enum";
import { SubscriptionStatus } from "../enums/subscription.enum";

export interface Availability {
  day: string;
  startTime: string;
  endTime: string;
}

export interface IProviderRegistrationData {
  fullName: string;
  phoneNumber: string;
  email: string;
  serviceArea: string;
  serviceLocation: {
    type: "Point";
    coordinates: number[];
  };
  availability?: {
    day: string;
    startTime: string;
    endTime: string;
  }[];
  aadhaarIdProof: string;
  profilePhoto: string;
  userId: string;
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
  rating: number;
  serviceName?: string;
  serviceOffered?: string[]

}

export interface IFeaturedProviders {
  id: string;
  userId: string;
  fullName: string;
  profilePhoto: string;

}

export interface ISubscription {
  planId?: string | Types.ObjectId;
  startDate?: Date;
  endDate?: Date;
  status: SubscriptionStatus
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface DaySchedule {
  day: string;
  active: boolean;
  slots: TimeSlot[];
}

export interface DateOverride {
  date: string;
  isUnavailable: boolean;
  busySlots: TimeSlot[];
  reason?: string;
}

export interface LeavePeriod {
  from: string;
  to: string;
  reason?: string;
}

export interface IProviderProfile {
  aadhaarIdProof?: string;
  id: string;
  userId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  serviceLocation: string;
  serviceArea: string;
  profilePhoto: string;
  status: ProviderStatus;
  availability: {
    weeklySchedule: DaySchedule[];
    dateOverrides: DateOverride[];
    leavePeriods: LeavePeriod[];
  };
  earnings: number;
  totalBookings: number;
  payoutPending: number;
  rating: number;
  isVerified: boolean
  subscription?: ISubscription;
  createdAt?: Date;
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
  serviceLocation?: string;
  experience: number;
  availability: {
    weeklySchedule: DaySchedule[];
    dateOverrides: DateOverride[];
    leavePeriods: LeavePeriod[];
  };
  status: string;
  earnings: number;
  price: number;
  totalBookings: number;
  distanceKm?: number;
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
  lastMessage: string | null; 
  messageType: 'text' | 'image' | 'file';
  lastMessageSenderId: string | null; 
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

export interface EarningsAnalyticsData {
  totalEarnings: number;
  earningsChangePercentage: number;
  totalClients: number;
  newClients: number;
  topService: { name: string; earnings: number };
  breakdown: Array<{
    date: Date;
    service: string;
    client: string;
    amount: number;
    status: string;
  }>;
}


export interface IReview {
  name: string;
  time: string;
  rating: number;
  comment: string;
  avatar: string;
}

export interface IRatingDistribution {
  stars: number;
  count: number;
  percentage: number;
}

export interface IMonthlyTrend {
  month: string;
  value: number; 
}

export interface IServiceBreakdown {
  serviceName: string;
  completed: number;
  total: number;
  completionRate: number;
}

export interface IProviderPerformance {
  providerId: string;
  providerName: string;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalEarnings: number;
  avgRating: number;
  activeServices: number;
  completionRate: string;
  cancellationRate: string;
  reviews: IReview[];
  ratingDistribution: IRatingDistribution[];
  starRatingTrend: IMonthlyTrend[];
  serviceBreakdown: IServiceBreakdown[];
}

export interface IAvailabilityUpdateData {
    weeklySchedule: DaySchedule[];
    dateOverrides: DateOverride[];
    leavePeriods: LeavePeriod[];
}


export interface IServiceDetails {
  _id: string;
  title: string;
  description: string;
  price: number;
  priceUnit: string;
  duration: string;
  categoryId: { name: string };
  subCategoryId: { name: string };
  experience?: number;
}

export interface IProviderDetailsResponse {
  provider: IProviderProfile;
  services: IServiceDetails[];
}