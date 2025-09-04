import { Schema, model, Types, HydratedDocument, InferSchemaType } from "mongoose";
import { TransactionStatus } from "../enums/payment&Wallet.enum";

const TransactionSchema = new Schema(
  {
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
      required: true, // e.g. Booking, Refund, Admin
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
      default: TransactionStatus.PAYMENT

    }
  },
  {
    timestamps: true,
  }
);

type TransactionSchemaType = InferSchemaType<typeof TransactionSchema>;

export interface ITransaction extends HydratedDocument<TransactionSchemaType> {}

export const Transaction = model<ITransaction>("Transaction", TransactionSchema);
