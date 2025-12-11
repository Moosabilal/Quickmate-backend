import { ClientSession, FilterQuery } from "mongoose";
import { IWallet } from "../../models/wallet";
import { IBaseRepository } from "./base/IBaseRepository";
import { ITransaction } from "../../models/transaction";
import { TransactionFilterOptions } from "../../interface/wallet";


export interface IWalletRepository extends IBaseRepository<IWallet> {
    createTransaction(data: Partial<ITransaction>,session?: ClientSession): Promise<ITransaction>;
    getTransactions(filterOpts: TransactionFilterOptions,skip?: number, limit?: number): Promise<ITransaction[]>;
    transactionCount(filterOpts: TransactionFilterOptions): Promise<number>
}