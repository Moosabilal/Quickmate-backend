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
exports.startBookingExpiryJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const container_1 = require("../di/container");
const type_1 = __importDefault(require("../di/type"));
const booking_enum_1 = require("../enums/booking.enum");
const userRoles_1 = require("../enums/userRoles");
const payment_wallet_enum_1 = require("../enums/payment&wallet.enum");
const date_fns_1 = require("date-fns");
const logger_1 = __importDefault(require("../logger/logger"));
const emailService_1 = require("../utils/emailService");
const startBookingExpiryJob = () => {
    node_cron_1.default.schedule('1 0 * * *', () => __awaiter(void 0, void 0, void 0, function* () {
        logger_1.default.info('⏳ [Cron] Checking for expired bookings...');
        const bookingRepo = container_1.container.get(type_1.default.BookingRepository);
        const walletRepo = container_1.container.get(type_1.default.WalletRepository);
        const providerRepo = container_1.container.get(type_1.default.ProviderRepository);
        try {
            const yesterday = (0, date_fns_1.subDays)(new Date(), 1);
            const cutoffDateStr = (0, date_fns_1.format)(yesterday, 'yyyy-MM-dd');
            const overdueBookings = yield bookingRepo.findOverdueBookings(cutoffDateStr);
            if (overdueBookings.length === 0) {
                logger_1.default.info('✅ [Cron] No overdue bookings found.');
                return;
            }
            logger_1.default.info(`⚠️ [Cron] Found ${overdueBookings.length} overdue bookings. Processing...`);
            for (const booking of overdueBookings) {
                const bookingId = booking._id.toString();
                const updateData = { status: booking_enum_1.BookingStatus.EXPIRED };
                if (booking.paymentStatus === userRoles_1.PaymentStatus.PAID && booking.userId) {
                    const userId = booking.userId.toString();
                    const wallet = yield walletRepo.findOne({ ownerId: userId });
                    if (wallet) {
                        const refundAmount = Number(booking.amount);
                        wallet.balance += refundAmount;
                        yield walletRepo.update(wallet._id.toString(), wallet);
                        yield walletRepo.createTransaction({
                            walletId: wallet._id,
                            transactionType: "credit",
                            source: "refund",
                            remarks: `Expired Booking #${bookingId.slice(-6)}`,
                            amount: refundAmount,
                            status: payment_wallet_enum_1.TransactionStatus.REFUND,
                            description: `Refund for missed service on ${booking.scheduledDate}`,
                        });
                        logger_1.default.info(`💰 [Cron] Refunded ₹${refundAmount} to user ${userId}`);
                        updateData.paymentStatus = userRoles_1.PaymentStatus.REFUNDED;
                    }
                }
                if (booking.providerId) {
                    const providerId = booking.providerId.toString();
                    const provider = yield providerRepo.findById(providerId);
                    if (provider) {
                        const currentRating = provider.rating || 5;
                        let newRating = currentRating - 1;
                        if (newRating < 1)
                            newRating = 1;
                        provider.rating = newRating;
                        yield providerRepo.update(providerId, { rating: newRating });
                        logger_1.default.info(`📉 [Cron] Penalized provider ${providerId}. Rating dropped from ${currentRating} to ${newRating}.`);
                        if (provider.email) {
                            yield (0, emailService_1.sendPenaltyEmail)(provider.email, booking.scheduledDate, newRating);
                        }
                    }
                }
                yield bookingRepo.update(bookingId, updateData);
                logger_1.default.info(`❌ [Cron] Booking ${bookingId} marked as EXPIRED.`);
            }
        }
        catch (error) {
            logger_1.default.error('❌ [Cron] Error processing expired bookings:', error);
        }
    }));
};
exports.startBookingExpiryJob = startBookingExpiryJob;
