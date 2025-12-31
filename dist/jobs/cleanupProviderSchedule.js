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
exports.startScheduleCleanupJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const date_fns_1 = require("date-fns");
const Providers_1 = require("../models/Providers");
const startScheduleCleanupJob = () => {
    node_cron_1.default.schedule('0 0 * * *', () => __awaiter(void 0, void 0, void 0, function* () {
        console.log('🧹 Starting Provider Schedule Cleanup Job...');
        try {
            const yesterday = (0, date_fns_1.subDays)(new Date(), 1);
            const cutoffDateStr = (0, date_fns_1.format)(yesterday, 'yyyy-MM-dd');
            const providers = yield Providers_1.Provider.find({
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
                    const filteredOverrides = provider.availability.dateOverrides.filter((override) => override.date > cutoffDateStr);
                    if (filteredOverrides.length !== originalLength) {
                        provider.availability.dateOverrides = filteredOverrides;
                        isModified = true;
                    }
                }
                if (provider.availability.leavePeriods && provider.availability.leavePeriods.length > 0) {
                    const originalLength = provider.availability.leavePeriods.length;
                    const filteredLeaves = provider.availability.leavePeriods.filter((leave) => leave.to > cutoffDateStr);
                    if (filteredLeaves.length !== originalLength) {
                        provider.availability.leavePeriods = filteredLeaves;
                        isModified = true;
                    }
                }
                if (isModified) {
                    yield provider.save();
                    updatedCount++;
                }
            }
            console.log(`Schedule Cleanup Complete. Updated ${updatedCount} providers.`);
        }
        catch (error) {
            console.error('Error in Schedule Cleanup Job:', error);
        }
    }));
};
exports.startScheduleCleanupJob = startScheduleCleanupJob;
