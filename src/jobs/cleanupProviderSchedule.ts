import cron from 'node-cron';
import { format, subDays } from 'date-fns';
import { Provider } from '../models/Providers';

export const startScheduleCleanupJob = () => {
    cron.schedule('0 0 * * *', async () => {
        console.log('🧹 Starting Provider Schedule Cleanup Job...');
        
        try {
            const yesterday = subDays(new Date(), 1);
            const cutoffDateStr = format(yesterday, 'yyyy-MM-dd');

            const providers = await Provider.find({
                $or: [
                    { 'availability.dateOverrides': { $exists: true, $not: { $size: 0 } } },
                    { 'availability.leavePeriods': { $exists: true, $not: { $size: 0 } } }
                ]
            });

            let updatedCount = 0;

            for (const provider of providers) {
                let isModified = false;

                if (provider.availability.dateOverrides && provider.availability.dateOverrides.length > 0) {
                    const originalLength = provider.availability.dateOverrides.length;
                    
                    const filteredOverrides = provider.availability.dateOverrides.filter(
                        (override) => override.date > cutoffDateStr
                    );

                    if (filteredOverrides.length !== originalLength) {
                        provider.availability.dateOverrides = filteredOverrides as any;
                        isModified = true;
                    }
                }

                if (provider.availability.leavePeriods && provider.availability.leavePeriods.length > 0) {
                    const originalLength = provider.availability.leavePeriods.length;

                    const filteredLeaves = provider.availability.leavePeriods.filter(
                        (leave) => leave.to > cutoffDateStr
                    );

                    if (filteredLeaves.length !== originalLength) {
                        provider.availability.leavePeriods = filteredLeaves as any;
                        isModified = true;
                    }
                }

                if (isModified) {
                    await provider.save();
                    updatedCount++;
                }
            }

            console.log(`Schedule Cleanup Complete. Updated ${updatedCount} providers.`);

        } catch (error) {
            console.error('Error in Schedule Cleanup Job:', error);
        }
    });
};