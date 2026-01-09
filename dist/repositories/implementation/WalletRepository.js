var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { injectable } from "inversify";
import { Wallet } from "../../models/wallet.js";
import { BaseRepository } from "./base/BaseRepository.js";
import {} from "../interface/IWalletRepository.js";
import { Transaction } from "../../models/transaction.js";
import {} from "mongoose";
import {} from "../../interface/wallet.js";
let WalletRepository = class WalletRepository extends BaseRepository {
    constructor() {
        super(Wallet);
    }
    async createTransaction(data, session) {
        const [txn] = await Transaction.create([data], { session });
        return txn;
    }
    async getTransactions(filterOpts, skip, limit = 20) {
        const query = this.buildTransactionQuery(filterOpts);
        return Transaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec();
    }
    async transactionCount(filterOpts) {
        const query = this.buildTransactionQuery(filterOpts);
        return Transaction.countDocuments(query).exec();
    }
    buildTransactionQuery(filterOpts) {
        const query = {
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
};
WalletRepository = __decorate([
    injectable(),
    __metadata("design:paramtypes", [])
], WalletRepository);
export { WalletRepository };
