"use strict";
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
exports.verifyPaymentSignature = exports.paymentCreation = exports.razorpay = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = require("crypto");
exports.razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
});
const paymentCreation = (amount) => __awaiter(void 0, void 0, void 0, function* () {
    return yield exports.razorpay.orders.create({
        amount: amount * 100,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`
    });
});
exports.paymentCreation = paymentCreation;
const verifyPaymentSignature = (orderId, paymentId, signature) => {
    const hmac = (0, crypto_1.createHmac)('sha256', process.env.RAZORPAY_SECRET);
    hmac.update(orderId + '|' + paymentId);
    const generatedSignature = hmac.digest('hex');
    return generatedSignature === signature;
};
exports.verifyPaymentSignature = verifyPaymentSignature;
