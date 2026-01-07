import { type Request, type Response, type NextFunction } from "express";
import { inject, injectable } from "inversify";
import TYPES from "../di/type";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { type IChatBotService } from "../services/interface/IChatBotService";
import { CustomError } from "../utils/CustomError";
import { type IChatPaymentVerify } from "../interface/chatBot";

@injectable()
export class ChatbotController {
  private _chatbotService: IChatBotService;

  constructor(@inject(TYPES.ChatbotService) chatbotService: IChatBotService) {
    this._chatbotService = chatbotService;
  }

  public startSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.body.userId as string | undefined;
      const session = await this._chatbotService.startSession(userId);
      res.status(HttpStatusCode.OK).json({
        success: true,
        sessionId: session.sessionId,
        message: "Chat session started successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  public getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const history = await this._chatbotService.getHistory(sessionId);
      res.status(HttpStatusCode.OK).json({
        success: true,
        history,
        count: history.length,
      });
    } catch (error) {
      next(error);
    }
  };

  public postMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const { text } = req.body;

      if (!text || text.trim() === "") {
        throw new CustomError("Message text is required", HttpStatusCode.BAD_REQUEST);
      }

      const response = await this._chatbotService.sendMessage(sessionId, text);
      res.status(HttpStatusCode.OK).json({
        success: true,
        response,
      });
    } catch (error) {
      next(error);
    }
  };

  public verifyRazorpayPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        throw new CustomError("Session ID is required", HttpStatusCode.BAD_REQUEST);
      }

      const paymentData = req.body as IChatPaymentVerify;
      const booking = await this._chatbotService.verifyRazorpayPayment(sessionId, paymentData);

      res.status(HttpStatusCode.OK).json({
        success: true,
        booking,
        message: "Payment verified and booking confirmed successfully",
      });
    } catch (error) {
      next(error);
    }
  };
}
