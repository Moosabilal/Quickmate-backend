import cron from "node-cron";
import { container } from "../di/container.js";
import TYPES from "../di/type.js";
import { type IWalletRepository } from "../repositories/interface/IWalletRepository.js";
import { TransactionStatus } from "../enums/payment&wallet.enum.js";
import logger from "../logger/logger.js";
import mongoose from "mongoose";

export const startWalletClearingJob = () => {
  cron.schedule("5 0 * * *", async () => {
    logger.info("⏳ [Cron] Starting wallet balance clearance job...");

    const walletRepo = container.get<IWalletRepository>(TYPES.WalletRepository);

    try {
      const pendingTxns = await walletRepo.findPendingTransactionsToClear();

      if (pendingTxns.length === 0) {
        logger.info("✅ [Cron] No pending transactions to clear.");
        return;
      }

      logger.info(`🔄 [Cron] Found ${pendingTxns.length} transactions to clear.`);

      for (const txn of pendingTxns) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const wallet = await walletRepo.findById(txn.walletId.toString());
          if (!wallet) {
            logger.error(`❌ [Cron] Wallet not found for transaction ${txn._id}`);
            await session.abortTransaction();
            continue;
          }

          wallet.pendingBalance -= txn.amount;
          wallet.balance += txn.amount;

          await walletRepo.update(
            wallet._id.toString(),
            {
              pendingBalance: wallet.pendingBalance,
              balance: wallet.balance,
            },
            { session },
          );

          txn.status = TransactionStatus.CLEARED;
          await txn.save({ session });

          await session.commitTransaction();
          logger.info(`💰 [Cron] Cleared ₹${txn.amount} for wallet ${wallet._id}`);
        } catch (txnError) {
          await session.abortTransaction();
          logger.error(`❌ [Cron] Failed to clear transaction ${txn._id}:`, txnError);
        } finally {
          session.endSession();
        }
      }
      logger.info("✅ [Cron] Wallet balance clearance job completed.");
    } catch (error) {
      logger.error("❌ [Cron] Error during wallet clearance job:", error);
    }
  });
};
