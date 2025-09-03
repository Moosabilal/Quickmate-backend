import { injectable } from "inversify";
import { IWallet, Wallet } from "../../models/wallet";
import { BaseRepository } from "./base/BaseRepository";
import { IWalletRepository } from "../interface/IWalletRepository";
import { ITransaction, Transaction } from "../../models/transaction";
import { ClientSession } from "mongoose";

@injectable()
export class WalletRepository extends BaseRepository<IWallet> implements IWalletRepository {
    constructor() {
        super(Wallet)
    }

    async saveWallet(wallet: IWallet, session?: ClientSession): Promise<IWallet> {
        return wallet.save({ session });
    }

    async createTransaction(
        data: Partial<ITransaction>,
        session?: ClientSession
    ): Promise<ITransaction> {
        const [txn] = await Transaction.create([data], { session });
        return txn;
    }
 
    async getTransactions(walletId: string, limit: number = 20): Promise<ITransaction[]> {
        return Transaction.find({ walletId }).sort({ createdAt: -1 }).limit(limit);
    }
}