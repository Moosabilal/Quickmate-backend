import { FilterQuery } from "mongoose";
import { IBookingRequest } from "../../interface/booking.dto";
import { IBooking } from "../../models/Booking";
import { IBaseRepository } from "./base/IBaseRepository";
import { IServiceBreakdown } from "../../interface/provider.dto";

export interface IBookingRepository extends IBaseRepository<IBooking> {
    getDailyBookingCount(filter?: FilterQuery<IBooking>): Promise<{ date: string; total: number }[]>;
    findByProviderAndDateRange(providerIds: string[],startDate: string,endDate: string,statuses?: string[]): Promise<IBooking[]>
    findByProviderByTime(providerId: string, startDate: string, endDate: string, statuses?: string[]): Promise<IBooking[]>;
    findByProviderAndDateRangeForEarnings(providerId: string,startDate: Date,endDate: Date): Promise<IBooking[]>
    countUniqueClientsBeforeDate(providerId: string, date: Date): Promise<number>
    hasPriorBooking(userId: string, providerId: string, beforeDate: Date): Promise<boolean>; 
    getBookingStatsByService(providerId: string): Promise<IServiceBreakdown[]>;
    getBookingTrendsByMonth(months?: number): Promise<{ month: string; value: number }[]>;
    getBookingPatternsByDayOfWeek(): Promise<{ day: string; value: number }[]>;
    getTopServiceCategories(limit?: number): Promise<{ name: string; value: number }[]>;
}