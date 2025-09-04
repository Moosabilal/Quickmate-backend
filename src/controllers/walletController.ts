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
        const ownerType = req.user.role as Roles;  
        const data = await this.walletService.getSummary(userId, ownerType);
        res.json({ success: true, data });
    };

    // public deposit = async (req: AuthRequest, res: Response, next: NextFunction) => {
    //     const userId = req.user.id as string;
    //     const { amount, remarks } = req.body as { amount: number; remarks?: string };
    //     const wallet = await this.walletService.deposit(userId, Roles.USER, amount, "ManualTopup", remarks);
    //     res.json({ success: true, balance: wallet.balance });
    // };

    public initiateDeposit = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { amount } = req.body
            console.log('the smount in initial deposit', amount)
            const response = await this.walletService.initiateDeposit(amount)
            console.log('the response of init', response)
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
            console.log('the amount in verifying ', data)
            const response = await this.walletService.verifyDeposit(data)
            res.status(HttpStatusCode.OK).json(response)

        } catch (error) {
            next(error)
        }
    }
}