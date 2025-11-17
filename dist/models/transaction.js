"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = void 0;
const mongoose_1 = require("mongoose");
const payment_wallet_enum_1 = require("../enums/payment&wallet.enum");
const TransactionSchema = new mongoose_1.Schema({
    walletId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Wallet",
        required: true,
    },
    transactionType: {
        type: String,
        enum: ["credit", "debit"],
        required: true,
    },
    source: {
        type: String,
        required: true,
        trim: true,
    },
    remarks: {
        type: String,
        trim: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: Object.values(payment_wallet_enum_1.TransactionStatus),
        default: payment_wallet_enum_1.TransactionStatus.PAYMENT
    }
}, {
    timestamps: true,
});
exports.Transaction = (0, mongoose_1.model)("Transaction", TransactionSchema);
