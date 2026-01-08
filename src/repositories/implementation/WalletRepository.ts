import { injectable } from "inversify";
import { type IWallet, Wallet } from "../../models/wallet";
import { BaseRepository } from "./base/BaseRepository";
import { type IWalletRepository } from "../interface/IWalletRepository";
import { type ITransaction, Transaction } from "../../models/transaction";
import { type ClientSession, type FilterQuery } from "mongoose";
import { type TransactionFilterOptions } from "../../interface/wallet";

@injectable()
export class WalletRepository extends BaseRepository<IWallet> implements IWalletRepository {
  constructor() {
    super(Wallet);
  }

  async createTransaction(data: Partial<ITransaction>, session?: ClientSession): Promise<ITransaction> {
    const [txn] = await Transaction.create([data], { session });
    return txn;
  }

  async getTransactions(
    filterOpts: TransactionFilterOptions,
    skip: number,
    limit: number = 20,
  ): Promise<ITransaction[]> {
    const query = this.buildTransactionQuery(filterOpts);
    return Transaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec();
  }

  async transactionCount(filterOpts: TransactionFilterOptions): Promise<number> {
    const query = this.buildTransactionQuery(filterOpts);
    return Transaction.countDocuments(query).exec();
  }

  private buildTransactionQuery(filterOpts: TransactionFilterOptions): FilterQuery<ITransaction> {
    const query: FilterQuery<ITransaction> = {
      walletId: filterOpts.walletId,
    };

    if (filterOpts.status && filterOpts.status !== "All") {
      query.status = filterOpts.status;
    }

    if (filterOpts.transactionType) {
      query.transactionType = filterOpts.transactionType;
    }

    if (filterOpts.startDate || filterOpts.endDate) {
      query.createdAt = {};
      if (filterOpts.startDate) {
        query.createdAt.$gte = filterOpts.startDate;
      }
      if (filterOpts.endDate) {
        query.createdAt.$lte = filterOpts.endDate;
      }
    }

    return query;
  }
}
