export interface ISmsService {
  sendOtpSms(phone: string, otp: string): Promise<void>;
}
