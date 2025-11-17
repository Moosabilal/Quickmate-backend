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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../../di/type"));
const CustomError_1 = require("../../utils/CustomError");
const HttpStatusCode_1 = require("../../enums/HttpStatusCode");
const razorpay_1 = require("../../utils/razorpay");
const wallet_mapper_1 = require("../../utils/mappers/wallet.mapper");
const mongoose_1 = require("mongoose");
const payment_wallet_enum_1 = require("../../enums/payment&wallet.enum");
let WalletService = class WalletService {
    constructor(walletRepository) {
        this._walletRepository = walletRepository;
    }
    getOrCreateWallet(userId, ownerType) {
        return __awaiter(this, void 0, void 0, function* () {
            let wallet = yield this._walletRepository.findOne({ ownerId: userId, ownerType });
            if (!wallet) {
                const newWallet = {
                    ownerId: new mongoose_1.Types.ObjectId(userId),
                    ownerType,
                };
                wallet = yield this._walletRepository.create(newWallet);
            }
            return wallet;
        });
    }
    getSummary(userId, ownerType, filters, page, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            const wallet = yield this.getOrCreateWallet(userId, ownerType);
            const walletId = wallet._id.toString();
            const skip = (page - 1) * limit;
            const query = { walletId };
            if (filters.status && filters.status !== payment_wallet_enum_1.TransactionStatus.ALL) {
                query.status = filters.status;
            }
            if (filters.transactionType) {
                query.transactionType = filters.transactionType;
            }
            if (filters.startDate) {
                query.createdAt = { $gte: new Date(filters.startDate) };
            }
            const [txns, total] = yield Promise.all([
                this._walletRepository.getTransactions(query, skip, limit),
                this._walletRepository.transactionCount()
            ]);
            return {
                wallet,
                transactions: txns,
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            };
        });
    }
    initiateDeposit(amount) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!amount || amount <= 0) {
                throw new CustomError_1.CustomError("invalid amount", HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            const order = yield (0, razorpay_1.paymentCreation)(amount);
            return (0, wallet_mapper_1.toIInitiateDepositRes)(order);
        });
    }
    verifyDeposit(depositVerification) {
        return __awaiter(this, void 0, void 0, function* () {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, userId, description, transactionType, ownerType, status } = depositVerification;
            const isValid = (0, razorpay_1.verifyPaymentSignature)(razorpay_order_id, razorpay_payment_id, razorpay_signature);
            if (!isValid) {
                throw new CustomError_1.CustomError("signature mismatch", HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            const wallet = yield this.getOrCreateWallet(userId, ownerType);
            if (transactionType === "credit")
                wallet.balance += amount;
            else if (transactionType === "debit")
                wallet.balance -= amount;
            yield this._walletRepository.create(wallet);
            const source = transactionType === "credit" ? "deposit" : "withdrawn";
            yield this._walletRepository.createTransaction({
                walletId: wallet._id,
                transactionType,
                source,
                remarks: `Order ${razorpay_order_id}`,
                amount: amount,
                status,
                description,
            });
            return {
                message: "transaction verified"
            };
        });
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.WalletRepository)),
    __metadata("design:paramtypes", [Object])
], WalletService);
