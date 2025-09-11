import { inject, injectable } from "inversify";
import { IWalletService } from "../interface/IWalletService";
import { IWalletRepository } from "../../repositories/interface/IWalletRepository";
import TYPES from "../../di/type";
import { CustomError } from "../../utils/CustomError";
import { HttpStatusCode } from "../../enums/HttpStatusCode";
import { paymentCreation, verifyPaymentSignature } from "../../utils/razorpay";
import { toIInitiateDepositRes } from "../../mappers/wallet.mapper";
import { IOrder, WalletFilter } from "../../dto/payment.dto";
import { IDepositVerification, IInitiateDepositRes } from "../../dto/wallet.dto";
import { IWallet } from "../../models/wallet";
import { startSession, Types } from "mongoose";
import { Roles } from "../../enums/userRoles";
import { TransactionStatus } from "../../enums/payment&wallet.enum";

@injectable()
export class WalletService implements IWalletService {
    private _walletRepository: IWalletRepository;
    constructor(@inject(TYPES.WalletRepository) walletRepository: IWalletRepository) {
        this._walletRepository = walletRepository
    }

    private async getOrCreateWallet(userId: string, ownerType: Roles) {
        let wallet = await this._walletRepository.findOne({ ownerId: userId, ownerType });

        if (!wallet) {
            const newWallet: Partial<IWallet> = {
                ownerId: new Types.ObjectId(userId),
                ownerType,
            }
            wallet = await this._walletRepository.create(newWallet);
        }
        return wallet;
    }

    public async getSummary(userId: string, ownerType: Roles, filters: Partial<WalletFilter>, page: number, limit: number) {

        const wallet = await this.getOrCreateWallet(userId, ownerType);
        const walletId = wallet._id.toString()
        const skip = (page - 1) * limit
        const query: any = { walletId };

        if (filters.status && filters.status !== TransactionStatus.ALL) {
            query.status = filters.status;
        }
        if (filters.transactionType) {
            query.transactionType = filters.transactionType;
        }
        if (filters.startDate) {
            query.createdAt = { $gte: new Date(filters.startDate) };
        }
        const [txns, total] = await Promise.all([
            this._walletRepository.getTransactions(query, skip, limit),
            this._walletRepository.transactionCount()
        ]) 
        return { 
            wallet, 
            transactions: txns,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page

         };
    }

    public async initiateDeposit(amount: number): Promise<IInitiateDepositRes> {
        if (!amount || amount <= 0) {
            throw new CustomError("invalid amount", HttpStatusCode.BAD_REQUEST)
        }

        const order = await paymentCreation(amount)
        return toIInitiateDepositRes(order as IOrder)

    }

    public async verifyDeposit(depositVerification: IDepositVerification): Promise<{ message: string }> {

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, userId, description, transactionType, ownerType, status } = depositVerification

        const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        if (!isValid) {
            throw new CustomError("signature mismatch", HttpStatusCode.BAD_REQUEST)
        }

        const wallet = await this.getOrCreateWallet(userId, ownerType);
        if (transactionType === "credit") wallet.balance += amount;
        else if (transactionType === "debit") wallet.balance -= amount

        await this._walletRepository.create(wallet);

        const source = transactionType === "credit" ? "deposit" : "withdrawn"

        await this._walletRepository.createTransaction(
            {
                walletId: wallet._id,
                transactionType,
                source,
                remarks: `Order ${razorpay_order_id}`,
                amount: amount,
                status,
                description,
            },
        );

        return {
            message: "transaction verified"
        }
    }

}