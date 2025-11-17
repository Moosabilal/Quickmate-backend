"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const userRoles_1 = require("../enums/userRoles");
const booking_enum_1 = require("../enums/booking.enum");
const BookingSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    serviceId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Service',
        required: false,
    },
    providerId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Provider',
        required: false,
    },
    paymentId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Payment',
    },
    addressId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Address'
    },
    customerName: {
        type: String,
        required: false,
    },
    phone: {
        type: String,
        required: false,
    },
    instructions: {
        type: String,
    },
    paymentStatus: {
        type: String,
        enum: Object.values(userRoles_1.PaymentStatus),
        default: userRoles_1.PaymentStatus.UNPAID,
    },
    amount: {
        type: String,
    },
    status: {
        type: String,
        enum: Object.values(booking_enum_1.BookingStatus),
        default: booking_enum_1.BookingStatus.PENDING,
    },
    scheduledDate: {
        type: String,
        required: false
    },
    scheduledTime: {
        type: String,
        required: false
    },
    duration: {
        type: Number,
        required: false,
    },
    bookingDate: {
        type: Date,
        required: false,
    },
    reviewed: {
        type: Boolean,
        default: false,
    },
    createdBy: {
        type: String,
        enum: ['Bot', 'Manual'],
        default: 'Manual',
    },
}, { timestamps: true });
exports.default = mongoose_1.default.model('Booking', BookingSchema);
