var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { inject, injectable } from "inversify";
import TYPES from "../../di/type";
import { CustomError } from "../../utils/CustomError";
import { HttpStatusCode } from "../../enums/HttpStatusCode";
import { paymentCreation, verifyPaymentSignature } from "../../utils/razorpay";
import { toIInitiateDepositRes } from "../../utils/mappers/wallet.mapper";
import { Types } from "mongoose";
let WalletService = class WalletService {
    _walletRepository;
    constructor(walletRepository) {
        this._walletRepository = walletRepository;
    }
    async getOrCreateWallet(userId, ownerType) {
        let wallet = await this._walletRepository.findOne({
            ownerId: userId,
            ownerType,
        });
        if (!wallet) {
            const newWallet = {
                ownerId: new Types.ObjectId(userId),
                ownerType,
            };
            wallet = await this._walletRepository.create(newWallet);
        }
        return wallet;
    }
    async getSummary(userId, ownerType, filters, page, limit) {
        const wallet = await this.getOrCreateWallet(userId, ownerType);
        const skip = (page - 1) * limit;
        const filterOptions = {
            walletId: wallet._id.toString(),
            status: filters.status,
            transactionType: filters.transactionType,
            startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        };
        const [txns, total] = await Promise.all([
            this._walletRepository.getTransactions(filterOptions, skip, limit),
            this._walletRepository.transactionCount(filterOptions),
        ]);
        return {
            wallet,
            transactions: txns,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }
    async initiateDeposit(amount) {
        if (!amount || amount <= 0) {
            throw new CustomError("invalid amount", HttpStatusCode.BAD_REQUEST);
        }
        const order = await paymentCreation(amount);
        return toIInitiateDepositRes(order);
    }
    async verifyDeposit(depositVerification) {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, userId, description, transactionType, ownerType, status, } = depositVerification;
        const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        if (!isValid) {
            throw new CustomError("signature mismatch", HttpStatusCode.BAD_REQUEST);
        }
        const wallet = await this.getOrCreateWallet(userId, ownerType);
        if (transactionType === "credit")
            wallet.balance += amount;
        else if (transactionType === "debit")
            wallet.balance -= amount;
        await this._walletRepository.create(wallet);
        const source = transactionType === "credit" ? "deposit" : "withdrawn";
        await this._walletRepository.createTransaction({
            walletId: wallet._id,
            transactionType,
            source,
            remarks: `Order ${razorpay_order_id}`,
            amount: amount,
            status,
            description,
        });
        return {
            message: "transaction verified",
        };
    }
};
WalletService = __decorate([
    injectable(),
    __param(0, inject(TYPES.WalletRepository)),
    __metadata("design:paramtypes", [Object])
], WalletService);
export { WalletService };
