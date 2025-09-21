import { inject, injectable } from "inversify";
import { IWalletService } from "../services/interface/IWalletService";
import TYPES from "../di/type";
import { AuthRequest } from "../middleware/authMiddleware";
import { NextFunction, Response } from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { Roles } from "../enums/userRoles";
import { TransactionStatus } from "../enums/payment&wallet.enum";

@injectable()
export class WalletController {
    private _walletService: IWalletService;
    constructor(@inject(TYPES.WalletService) walletService: IWalletService) {
        this._walletService = walletService
    }

    public getWallet = async (req: AuthRequest, res: Response, next: NextFunction) => {
        const userId = req.user.id as string;
        const ownerType = req.user.role as Roles;
        const status = req.query.status as TransactionStatus;
        const startDate = req.query.startDate as string;
        const transactionType = req.query.transactionType as "credit" | "debit" | "";
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const filters = { status, startDate, transactionType }
        const data = await this._walletService.getSummary(userId, ownerType, filters, page, limit);
        res.json({ success: true, data });
    };

    public initiateDeposit = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { amount } = req.body
            const response = await this._walletService.initiateDeposit(amount)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public verifyDeposit = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = {
                ...req.body,
                userId: req.user.id,
                ownerType: req.user.role
            }
            const response = await this._walletService.verifyDeposit(data)
            res.status(HttpStatusCode.OK).json(response)

        } catch (error) {
            next(error)
        }
    }
}