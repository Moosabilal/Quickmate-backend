import { injectable } from "inversify";
import twilio from "twilio";
import type { ISmsService } from "../interface/ISmsService.js";
import { CustomError } from "../../utils/CustomError.js";
import { HttpStatusCode } from "../../enums/HttpStatusCode.js";
import logger from "../../logger/logger.js";

@injectable()
export class TwilioSmsService implements ISmsService {
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER as string;

    if (!accountSid || !authToken || !this.fromNumber) {
      logger.error("Twilio credentials are missing in .env");
    }

    this.client = twilio(accountSid, authToken);
  }

  public async sendOtpSms(phone: string, otp: string): Promise<void> {
    try {
      const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

      await this.client.messages.create({
        body: `Your QuickMate verification code is: ${otp}. Do not share this with anyone.`,
        from: this.fromNumber,
        to: formattedPhone,
      });

      logger.info(`SMS sent successfully to ${formattedPhone}`);
    } catch (error) {
      logger.error(`Failed to send SMS to ${phone}: ${error.message}`);
      throw new CustomError("Failed to send SMS OTP. Please try again.", HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  }
}
