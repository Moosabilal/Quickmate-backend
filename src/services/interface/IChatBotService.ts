import { type IChatbotResponse, type IChatPaymentVerify } from "../../interface/chatBot";
import { type IBooking } from "../../models/Booking";
import { type IChatMessage } from "../../models/chatMessage";
import { type IChatSession } from "../../models/chatSession";

export interface IChatBotService {
  startSession(userId?: string): Promise<IChatSession>;
  getHistory(sessionId: string): Promise<IChatMessage[]>;
  sendMessage(sessionId: string, userMessage: string): Promise<IChatbotResponse>;
  verifyRazorpayPayment(userId: string, paymentData: IChatPaymentVerify): Promise<IBooking>;
}
