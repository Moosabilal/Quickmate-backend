import { inject, injectable } from "inversify";
import { IWalletService } from "../services/interface/IWalletService";
import TYPES from "../di/type";
import { AuthRequest } from "../middleware/authMiddleware";
import { NextFunction, Response } from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { Roles } from "../enums/userRoles";

@injectable()
export class WalletController {
    private walletService: IWalletService;
    constructor(@inject(TYPES.WalletService) walletService: IWalletService) {
        this.walletService = walletService
    }

    public getWallet = async (req: AuthRequest, res: Response, next: NextFunction) => {
        const userId = req.user.id as string;  
        const ownerType = Roles.USER as const;              // adjust per your app
        const data = await this.walletService.getSummary(userId, ownerType);
        res.json({ success: true, data });
    };

    public deposit = async (req: AuthRequest, res: Response, next: NextFunction) => {
        console.log('now its time to deposit')
        const userId = req.user.id as string;
        const { amount, remarks } = req.body as { amount: number; remarks?: string };
        console.log('the amount and remarks', amount, remarks)
        const wallet = await this.walletService.deposit(userId, Roles.USER, amount, "ManualTopup", remarks);
        console.log('the return ddata', wallet)
        res.json({ success: true, balance: wallet.balance });
    };

    public initiateDeposit = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { amount } = req.body
            console.log('the amont', amount)
            const response = await this.walletService.initiateDeposit(amount)
            console.log('the response to frontend', response)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public verifyDeposit = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = {
                ...req.body,
                userId: req.user.id
            }
            const response = await this.walletService.verifyDeposit(data)
            res.status(HttpStatusCode.OK).json(response)

        } catch (error) {
            next(error)
        }
    }
}