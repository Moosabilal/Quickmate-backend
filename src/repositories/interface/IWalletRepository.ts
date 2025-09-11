import { ClientSession, FilterQuery } from "mongoose";
import { IWallet } from "../../models/wallet";
import { IBaseRepository } from "./base/IBaseRepository";
import { ITransaction } from "../../models/transaction";


export interface IWalletRepository extends IBaseRepository<IWallet> {
    createTransaction(data: Partial<ITransaction>,session?: ClientSession): Promise<ITransaction>;
    getTransactions(filter: FilterQuery<ITransaction>,skip?: number, limit?: number): Promise<ITransaction[]>;
    transactionCount(): Promise<number>
}