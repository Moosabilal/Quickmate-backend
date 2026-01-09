import { type IChatbotResponse, type IChatPaymentVerify } from "../../interface/chatBot.js";
import { type IBooking } from "../../models/Booking.js";
import { type IChatMessage } from "../../models/chatMessage.js";
import { type IChatSession } from "../../models/chatSession.js";

export interface IChatBotService {
  startSession(userId?: string): Promise<IChatSession>;
  getHistory(sessionId: string): Promise<IChatMessage[]>;
  sendMessage(sessionId: string, userMessage: string): Promise<IChatbotResponse>;
  verifyRazorpayPayment(userId: string, paymentData: IChatPaymentVerify): Promise<IBooking>;
}
