import { Request, Response, NextFunction } from 'express';
import { inject, injectable } from 'inversify';
import TYPES from '../di/type';
import { HttpStatusCode } from '../enums/HttpStatusCode';
import { IChatBotService } from '../services/interface/IChatBotService';
import { AuthRequest } from '../middleware/authMiddleware';
import { CustomError } from '../utils/CustomError';

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
      res.status(HttpStatusCode.OK).json({ success: true, sessionId: session.sessionId });
    } catch (error) { next(error); }
  };

  public getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const history = await this._chatbotService.getHistory(sessionId);
      res.status(HttpStatusCode.OK).json({ success: true, history });
    } catch (error) { next(error); }
  };

  public postMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const { text } = req.body;
      if (!text) {
        throw new CustomError("Message text is required", HttpStatusCode.BAD_REQUEST);
      }
      const response = await this._chatbotService.sendMessage(sessionId, text);
      res.status(HttpStatusCode.OK).json({ success: true, response });
    } catch (error) { next(error); }
  };

  public createRazorpayOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const orderData = req.body;
      const order = await this._chatbotService.createRazorpayOrder(userId!, orderData);
      res.status(HttpStatusCode.OK).json({ success: true, order });
    } catch (error) { next(error); }
  };

  public verifyRazorpayPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const paymentData = req.body;
      const booking = await this._chatbotService.verifyRazorpayPayment(userId!, paymentData);
      res.status(HttpStatusCode.OK).json({ success: true, booking });
    } catch (error) { next(error); }
  };
}
