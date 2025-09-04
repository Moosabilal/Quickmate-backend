import { injectable } from "inversify";
import { IWallet, Wallet } from "../../models/wallet";
import { BaseRepository } from "./base/BaseRepository";
import { IWalletRepository } from "../interface/IWalletRepository";
import { ITransaction, Transaction } from "../../models/transaction";
import { ClientSession, FilterQuery } from "mongoose";

@injectable()
export class WalletRepository extends BaseRepository<IWallet> implements IWalletRepository {
    constructor() {
        super(Wallet)
    }

    // async saveWallet(wallet: IWallet): Promise<IWallet> {
    //     return wallet.save();
    // }

    async createTransaction(
        data: Partial<ITransaction>,
        session?: ClientSession
    ): Promise<ITransaction> {
        const [txn] = await Transaction.create([data], { session });
        return txn;
    }
 
    async getTransactions(filter: FilterQuery<ITransaction>,skip: number, limit: number = 20): Promise<ITransaction[]> {
        return Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
    }

    async transactionCount(): Promise<number> {
        return Transaction.countDocuments()
    }
}