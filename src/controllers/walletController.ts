import { inject, injectable } from "inversify";
import { type IWalletService } from "../services/interface/IWalletService";
import TYPES from "../di/type";
import { type AuthRequest } from "../middleware/authMiddleware";
import { type NextFunction, type Response } from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { type Roles } from "../enums/userRoles";
import { ZodError } from "zod";
import {
  getWalletQuerySchema,
  initiateDepositSchema,
  verifyDepositSchema,
} from "../utils/validations/wallet.validation";

@injectable()
export class WalletController {
  private _walletService: IWalletService;
  constructor(@inject(TYPES.WalletService) walletService: IWalletService) {
    this._walletService = walletService;
  }

  public getWallet = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 10, ...filters } = getWalletQuerySchema.parse(req.query);
      const userId = req.user.id as string;
      const ownerType = req.user.role as Roles;

      const data = await this._walletService.getSummary(userId, ownerType, filters, page, limit);
      res.json({ success: true, data });
    } catch (error) {
      if (error instanceof ZodError)
        res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
      next(error);
    }
  };

  public initiateDeposit = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { amount } = initiateDepositSchema.parse(req.body);
      const response = await this._walletService.initiateDeposit(amount);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      if (error instanceof ZodError)
        res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
      next(error);
    }
  };

  public verifyDeposit = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const validatedBody = verifyDepositSchema.parse(req.body);
      const data = {
        ...validatedBody,
        userId: req.user.id,
        ownerType: req.user.role as Roles,
      };
      const response = await this._walletService.verifyDeposit(data);
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      if (error instanceof ZodError)
        res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
      next(error);
    }
  };
}
