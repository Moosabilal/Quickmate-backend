import cron from "node-cron";
import { container } from "../di/container.js";
import TYPES from "../di/type.js";
import { type IProviderRepository } from "../repositories/interface/IProviderRepository.js";
import { SubscriptionStatus } from "../enums/subscription.enum.js";
import { type ISubscriptionPlanService } from "../services/interface/ISubscriptionPlanService.js";
import logger from "../logger/logger.js";

export const startSubscriptionCron = () => {
  cron.schedule("0 0 * * *", async () => {
    logger.info("⏳ Running Subscription Expiry Cron Job...");

    try {
      const providerRepository = container.get<IProviderRepository>(TYPES.ProviderRepository);
      const subscriptionService = container.get<ISubscriptionPlanService>(TYPES.SubscriptionPlanService);

      const today = new Date();

      const providers = await providerRepository.findAll({
        "subscription.status": SubscriptionStatus.ACTIVE,
        "subscription.endDate": { $lt: today },
      });

      if (providers.length > 0) {
        logger.info(`Found ${providers.length} potential expirations. Processing...`);

        const updates = providers.map(async (provider) => {
          try {
            await subscriptionService.checkAndExpire(provider.id);
          } catch (err) {
            console.error(`Failed to process expiry for provider ${provider.id}`, err);
          }
        });

        await Promise.all(updates);
        logger.info("✅ Subscription Expiry Cron Job Completed.");
      } else {
        logger.info("✅ No overdue subscriptions found.");
      }
    } catch (error) {
      logger.error("❌ Error in Subscription Cron Job:", error);
    }
  });
};
