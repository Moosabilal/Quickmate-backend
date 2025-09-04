import { inject, injectable } from "inversify";
import { IWalletService } from "../interface/IWalletService";
import { IWalletRepository } from "../../repositories/interface/IWalletRepository";
import TYPES from "../../di/type";
import { CustomError } from "../../utils/CustomError";
import { HttpStatusCode } from "../../enums/HttpStatusCode";
import { paymentCreation, verifyPaymentSignature } from "../../utils/razorpay";
import { toIInitiateDepositRes } from "../../mappers/wallet.mapper";
import { IOrder } from "../../dto/payment.dto";
import { IDepositVerification, IInitiateDepositRes } from "../../dto/wallet.dto";
import { IWallet } from "../../models/wallet";
import { startSession, Types } from "mongoose";
import { Roles } from "../../enums/userRoles";

@injectable()
export class WalletService implements IWalletService {
    private walletRepository: IWalletRepository;
    constructor(@inject(TYPES.WalletRepository) walletRepository: IWalletRepository) {
        this.walletRepository = walletRepository
    }

    private async getOrCreateWallet(userId: string, ownerType: Roles) {
        let wallet = await this.walletRepository.findOne({ ownerId: userId, ownerType });

        if (!wallet) {
            const newWallet: Partial<IWallet> = {
                ownerId: new Types.ObjectId(userId),
                ownerType,
            }
            wallet = await this.walletRepository.create(newWallet);
        }
        return wallet;
    }

    // public async deposit(
    //     userId: string,
    //     ownerType: Roles,
    //     amount: number,
    //     source = "ManualTopup",
    //     description: string,
    //     transactionType: "credit" | "debit",
    //     remarks?: string,
        
    // ) {
    //     if (amount <= 0) throw new CustomError("Amount must be > 0", HttpStatusCode.BAD_REQUEST);

    //     const session = await startSession();
    //     session.startTransaction();
    //     try {
    //         const wallet = await this.getOrCreateWallet(userId, ownerType);
    //         if(transactionType === "credit") wallet.balance += amount;
    //         else if(transactionType === "debit") wallet.balance -= amount
            
    //         await this.walletRepository.saveWallet(wallet, session);

    //         await this.walletRepository.createTransaction(
    //             {
    //                 walletId: wallet._id,
    //                 transactionType,
    //                 source,
    //                 remarks,
    //                 amount,
    //                 description,
    //             },
    //             session
    //         );

    //         await session.commitTransaction();
    //         session.endSession();
    //         return wallet;
    //     } catch (err) {
    //         await session.abortTransaction();
    //         session.endSession();
    //         throw err;
    //     }
    // }

    public async getSummary(userId: string, ownerType: Roles) {
        const wallet = await this.getOrCreateWallet(userId, ownerType);
        const txns = await this.walletRepository.getTransactions(wallet._id.toString());
        return { wallet, transactions: txns };
    }

    public async initiateDeposit(amount: number): Promise<IInitiateDepositRes> {
        if (!amount || amount <= 0) {
            throw new CustomError("invalid amount", HttpStatusCode.BAD_REQUEST)
        }

        const order = await paymentCreation(amount)
        console.log('the order', order)
        return toIInitiateDepositRes(order as IOrder)

    }

    public async verifyDeposit(depositVerification: IDepositVerification): Promise<{ message: string }> {

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, userId, description, transactionType, ownerType } = depositVerification

        const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        if (!isValid) {
            throw new CustomError("signature mismatch", HttpStatusCode.BAD_REQUEST)
        }

        const wallet = await this.getOrCreateWallet(userId, ownerType);
         if(transactionType === "credit") wallet.balance += amount;
            else if(transactionType === "debit") wallet.balance -= amount
            
            await this.walletRepository.create(wallet);

            const source = transactionType === "credit" ? "deposit" : "withdrawn"

            await this.walletRepository.createTransaction(
                {
                    walletId: wallet._id,
                    transactionType,
                    source,
                    remarks: `Order ${razorpay_order_id}`,
                    amount: amount,
                    description,
                },
            );

        // await this.deposit(userId, Roles.USER, Number(amount) / 100, "Razorpay", description, transactionType, `Order ${razorpay_order_id}`)
        return {
            message: "transaction verified"
        }
    }

}