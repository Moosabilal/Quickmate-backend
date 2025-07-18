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