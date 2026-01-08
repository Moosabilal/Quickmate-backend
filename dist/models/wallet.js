import { Schema, model } from "mongoose";
import { Roles } from "../enums/userRoles";
const WalletSchema = new Schema({
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
}, {
    timestamps: true,
});
export const Wallet = model("Wallet", WalletSchema);
