import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import { Roles } from "../enums/userRoles.js";

const WalletSchema = new Schema(
  {
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    ownerType: {
      type: String,
      enum: Object.values(Roles),
      required: true,
      default: Roles.USER,
    },
  },
  {
    timestamps: true,
  },
);

type WalletSchemaType = InferSchemaType<typeof WalletSchema>;

export type IWallet = HydratedDocument<WalletSchemaType>;

export const Wallet = model<IWallet>("Wallet", WalletSchema);
