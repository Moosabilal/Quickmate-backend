import { Types } from "mongoose";
import { ProviderStatus } from "../enums/provider.enum";

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
  // serviceName: string;

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
  reviews?: number;
}

export interface IProviderForChatListPage {
  id: string;
  bookingId?: string;
  name: string;
  profilePicture: string;
  location: string;
  isOnline: boolean;
  services: string[]
  // completedJobs: number;
  description: string;
}