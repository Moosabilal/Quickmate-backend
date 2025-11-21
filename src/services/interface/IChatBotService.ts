import { IChatbotResponse, IChatPaymentVerify } from "../../interface/chatBot";
import { IChatMessage } from "../../models/chatMessage";
import { IChatSession } from "../../models/chatSession";

export interface IChatBotService {
  startSession(userId?: string): Promise<IChatSession>
  getHistory(sessionId: string): Promise<IChatMessage[]>
  sendMessage(sessionId: string, userMessage: string): Promise<IChatbotResponse>
  verifyRazorpayPayment(userId: string, paymentData: IChatPaymentVerify): Promise<any>;
  getSessionStatus(sessionId: string): Promise<any>
}