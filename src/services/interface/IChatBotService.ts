import { IChatbotResponse } from "../../interface/chatBot";
import { IChatMessage } from "../../models/chatMessage";
import { IChatSession } from "../../models/chatSession";

export interface IChatBotService {
  startSession(userId?: string): Promise<IChatSession>
  getHistory(sessionId: string): Promise<IChatMessage[]>
  sendMessage(sessionId: string, userMessage: string): Promise<IChatbotResponse>
  createRazorpayOrder(userId: string, orderData: any): Promise<any>;
  verifyRazorpayPayment(userId: string, paymentData: any): Promise<any>;
  getSessionStatus(sessionId: string): Promise<any>
}