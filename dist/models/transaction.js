import { Schema, model } from "mongoose";
import { TransactionStatus } from "../enums/payment&wallet.enum";
const TransactionSchema = new Schema({
    walletId: {
        type: Schema.Types.ObjectId,
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
        enum: Object.values(TransactionStatus),
        default: TransactionStatus.PAYMENT,
    },
}, {
    timestamps: true,
});
export const Transaction = model("Transaction", TransactionSchema);
