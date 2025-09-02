import { Schema, model, Types, HydratedDocument, InferSchemaType } from "mongoose";

const WalletSchema = new Schema(
  {
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
    ownerId: {
      type: Types.ObjectId,
      required: true,
      ref: "User",
    },
    ownerType: {
      type: String,
      enum: ["Customer", "Provider", "Admin"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

type WalletSchemaType = InferSchemaType<typeof WalletSchema>;

export interface IWallet extends HydratedDocument<WalletSchemaType> {}

export const Wallet = model<IWallet>("Wallet", WalletSchema);
