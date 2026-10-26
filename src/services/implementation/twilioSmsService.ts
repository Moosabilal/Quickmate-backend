import { injectable } from "inversify";
import twilio from "twilio";
import type { ISmsService } from "../interface/ISmsService.js";
import { CustomError } from "../../utils/CustomError.js";
import { HttpStatusCode } from "../../enums/HttpStatusCode.js";
import logger from "../../logger/logger.js";

@injectable()
export class TwilioSmsService implements ISmsService {
  private client: twilio.Twilio | null = null;
  private fromNumber: string | null = null;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      logger.warn("Twilio credentials are missing in .env. SMS service is running in mock/graceful mode.");
      return;
    }

    try {
      this.client = twilio(accountSid, authToken);
      this.fromNumber = fromNumber;
    } catch (error) {
      logger.warn(`Failed to initialize Twilio client: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async sendOtpSms(phone: string, otp: string): Promise<void> {
    if (!this.client || !this.fromNumber) {
      logger.warn(`Twilio SMS service is not configured. Simulating SMS OTP to ${phone}: ${otp}`);
      return;
    }

    try {
      const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

      await this.client.messages.create({
        body: `Your QuickMate verification code is: ${otp}. Do not share this with anyone.`,
        from: this.fromNumber,
        to: formattedPhone,
      });

      logger.info(`SMS sent successfully to ${formattedPhone}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to send SMS to ${phone}: ${errorMessage}`);
      throw new CustomError("Failed to send SMS OTP. Please try again.", HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  }
}
