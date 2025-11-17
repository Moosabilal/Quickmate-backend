"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wallet = void 0;
const mongoose_1 = require("mongoose");
const userRoles_1 = require("../enums/userRoles");
const WalletSchema = new mongoose_1.Schema({
    balance: {
        type: Number,
        required: true,
        default: 0,
    },
    ownerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: "User",
    },
    ownerType: {
        type: String,
        enum: Object.values(userRoles_1.Roles),
        required: true,
        default: userRoles_1.Roles.USER
    },
}, {
    timestamps: true,
});
exports.Wallet = (0, mongoose_1.model)("Wallet", WalletSchema);
