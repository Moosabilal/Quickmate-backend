import { type ClientSession } from "mongoose";
import { type IWallet } from "../../models/wallet";
import { type IBaseRepository } from "./base/IBaseRepository";
import { type ITransaction } from "../../models/transaction";
import { type TransactionFilterOptions } from "../../interface/wallet";

export interface IWalletRepository extends IBaseRepository<IWallet> {
  createTransaction(data: Partial<ITransaction>, session?: ClientSession): Promise<ITransaction>;
  getTransactions(filterOpts: TransactionFilterOptions, skip?: number, limit?: number): Promise<ITransaction[]>;
  transactionCount(filterOpts: TransactionFilterOptions): Promise<number>;
}
