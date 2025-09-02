import { Schema, model, Types, HydratedDocument, InferSchemaType } from "mongoose";

const TransactionSchema = new Schema(
  {
    walletId: {
      type: Types.ObjectId,
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
  },
  {
    timestamps: true,
  }
);

type TransactionSchemaType = InferSchemaType<typeof TransactionSchema>;

export interface ITransaction extends HydratedDocument<TransactionSchemaType> {}

export const Transaction = model<ITransaction>("Transaction", TransactionSchema);
