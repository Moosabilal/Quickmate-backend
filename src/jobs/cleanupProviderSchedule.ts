import cron from "node-cron";
import { format, subDays } from "date-fns";
import logger from "../logger/logger";
import { container } from "../di/container";
import TYPES from "../di/type";
import { type IProviderRepository } from "../repositories/interface/IProviderRepository";

export const startScheduleCleanupJob = () => {
  cron.schedule("0 0 * * *", async () => {
    logger.info("🧹 Starting Provider Schedule Cleanup Job...");

    try {
      const providerRepository = container.get<IProviderRepository>(TYPES.ProviderRepository);

      const yesterday = subDays(new Date(), 1);
      const cutoffDateStr = format(yesterday, "yyyy-MM-dd");

      const modifiedCount = await providerRepository.removePastAvailability(cutoffDateStr);

      if (modifiedCount > 0) {
        logger.info(`Schedule Cleanup Complete. Cleaned schedules for ${modifiedCount} providers.`);
      } else {
        logger.info("Checked providers but found nothing to clean.");
      }
    } catch (error) {
      logger.error("Error in Schedule Cleanup Job:", error);
    }
  });
};
