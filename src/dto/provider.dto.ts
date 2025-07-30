import { Types } from "mongoose";
export interface IProviderRegisterRequest {
  fullName: string;
  phoneNumber: string;
  email: string;

  categoryId: string;
  serviceId: string;

  serviceLocation: string;
  serviceArea: string;
  experience: number;

  availableDays: string[]; 

  timeSlot: {
    startTime: string;  
    endTime: string;    
  };

  verificationDocs: {
    aadhaarIdProof: string; 
    businessCertifications?: string; 
  };

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
  serviceId: string;
  serviceArea: string;
  profilePhoto: string;
  status: string;
  serviceName?: string;
  serviceCategoryId?: string

}

export interface IFeaturedProviders {
  id: string;
  userId: string;
  fullName: string;
  profilePhoto: string;
  serviceName: string;

}

export interface IProviderProfile {
  timeSlot: {
    startTime: string;
    endTime: string;
  };
  verificationDocs: {
    aadhaarIdProof: string;
    businessCertifications?: string;
  }
    id: string;
    userId: string;
    fullName: string;
    phoneNumber: string;
    email: string;
    price: Number;
    serviceId: string;
    serviceLocation: string;
    serviceArea: string;
    experience: number
    profilePhoto: string;
    status: string;
    availableDays: string[];
  
}

export interface ProviderFilterQuery {
  serviceId: Types.ObjectId;
  serviceArea?: { $regex: RegExp };
  experience?: { $gte: number };
  availableDays?: string;
  'timeSlot.startTime'?: { $lte: string };
  'timeSlot.endTime'?: { $gte: string };
  price?: { $lte: number };
}