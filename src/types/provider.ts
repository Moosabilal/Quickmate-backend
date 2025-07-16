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
