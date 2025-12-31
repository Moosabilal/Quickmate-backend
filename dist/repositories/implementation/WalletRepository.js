"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletRepository = void 0;
const inversify_1 = require("inversify");
const wallet_1 = require("../../models/wallet");
const BaseRepository_1 = require("./base/BaseRepository");
const transaction_1 = require("../../models/transaction");
let WalletRepository = class WalletRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super(wallet_1.Wallet);
    }
    createTransaction(data, session) {
        return __awaiter(this, void 0, void 0, function* () {
            const [txn] = yield transaction_1.Transaction.create([data], { session });
            return txn;
        });
    }
    getTransactions(filterOpts_1, skip_1) {
        return __awaiter(this, arguments, void 0, function* (filterOpts, skip, limit = 20) {
            const query = this.buildTransactionQuery(filterOpts);
            return transaction_1.Transaction.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec();
        });
    }
    transactionCount(filterOpts) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = this.buildTransactionQuery(filterOpts);
            return transaction_1.Transaction.countDocuments(query).exec();
        });
    }
    buildTransactionQuery(filterOpts) {
        const query = {
            walletId: filterOpts.walletId
        };
        if (filterOpts.status && filterOpts.status !== 'All') {
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
exports.WalletRepository = WalletRepository;
exports.WalletRepository = WalletRepository = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], WalletRepository);
