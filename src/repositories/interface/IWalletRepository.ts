import { type ClientSession } from "mongoose";
import { type IWallet } from "../../models/wallet.js";
import { type IBaseRepository } from "./base/IBaseRepository.js";
import { type ITransaction } from "../../models/transaction.js";
import { type TransactionFilterOptions } from "../../interface/wallet.js";

export interface IWalletRepository extends IBaseRepository<IWallet> {
  createTransaction(data: Partial<ITransaction>, session?: ClientSession): Promise<ITransaction>;
  getTransactions(filterOpts: TransactionFilterOptions, skip?: number, limit?: number): Promise<ITransaction[]>;
  transactionCount(filterOpts: TransactionFilterOptions): Promise<number>;
}
