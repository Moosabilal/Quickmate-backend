import cron from "node-cron";
import { container } from "../di/container.js";
import TYPES from "../di/type.js";
import { type IBookingRepository } from "../repositories/interface/IBookingRepository.js";
import { type IWalletRepository } from "../repositories/interface/IWalletRepository.js";
import { BookingStatus } from "../enums/booking.enum.js";
import { PaymentStatus } from "../enums/userRoles.js";
import { TransactionStatus } from "../enums/payment&wallet.enum.js";
import { format, subDays } from "date-fns";
import logger from "../logger/logger.js";
import { type IProviderRepository } from "../repositories/interface/IProviderRepository.js";
import { sendPenaltyEmail } from "../utils/emailService.js";
import { type IBooking } from "../models/Booking.js";

export const startBookingExpiryJob = () => {
  cron.schedule("1 0 * * *", async () => {
    logger.info("⏳ [Cron] Checking for expired bookings...");

    const bookingRepo = container.get<IBookingRepository>(TYPES.BookingRepository);
    const walletRepo = container.get<IWalletRepository>(TYPES.WalletRepository);
    const providerRepo = container.get<IProviderRepository>(TYPES.ProviderRepository);

    try {
      const yesterday = subDays(new Date(), 1);
      const cutoffDateStr = format(yesterday, "yyyy-MM-dd");

      const overdueBookings = await bookingRepo.findOverdueBookings(cutoffDateStr);

      if (overdueBookings.length === 0) {
        logger.info("✅ [Cron] No overdue bookings found.");
        return;
      }

      logger.info(`⚠️ [Cron] Found ${overdueBookings.length} overdue bookings. Processing...`);

      for (const booking of overdueBookings) {
        const bookingId = booking._id.toString();

        const updateData: Partial<IBooking> = { status: BookingStatus.EXPIRED };

        if (booking.paymentStatus === PaymentStatus.PAID && booking.userId) {
          const userId = booking.userId.toString();

          const wallet = await walletRepo.findOne({ ownerId: userId });

          if (wallet) {
            const refundAmount = Number(booking.amount);

            wallet.balance += refundAmount;
            await walletRepo.update(wallet._id.toString(), wallet);

            await walletRepo.createTransaction({
              walletId: wallet._id,
              transactionType: "credit",
              source: "refund",
              remarks: `Expired Booking #${bookingId.slice(-6)}`,
              amount: refundAmount,
              status: TransactionStatus.REFUND,
              description: `Refund for missed service on ${booking.scheduledDate}`,
            });

            logger.info(`💰 [Cron] Refunded ₹${refundAmount} to user ${userId}`);

            updateData.paymentStatus = PaymentStatus.REFUNDED;
          }
        }

        if (booking.providerId) {
          const providerId = booking.providerId.toString();
          const provider = await providerRepo.findById(providerId);

          if (provider) {
            const currentRating = provider.rating || 5;
            let newRating = currentRating - 1;
            if (newRating < 1) newRating = 1;

            provider.rating = newRating;
            await providerRepo.update(providerId, { rating: newRating });

            logger.info(
              `📉 [Cron] Penalized provider ${providerId}. Rating dropped from ${currentRating} to ${newRating}.`,
            );

            if (provider.email) {
              await sendPenaltyEmail(provider.email, booking.scheduledDate as string, newRating);
            }
          }
        }

        await bookingRepo.update(bookingId, updateData);

        logger.info(`❌ [Cron] Booking ${bookingId} marked as EXPIRED.`);
      }
    } catch (error) {
      logger.error("❌ [Cron] Error processing expired bookings:", error);
    }
  });
};
