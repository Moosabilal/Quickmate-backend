import { FilterQuery } from "mongoose";
import { IBookingHistoryPage, IBookingRequest, IBookingStatusCount, IProviderBookingManagement } from "../../interface/booking";
import { IBooking } from "../../models/Booking";
import { IBaseRepository } from "./base/IBaseRepository";
import { IServiceBreakdown } from "../../interface/provider";
import { BookingStatus } from "../../enums/booking.enum";

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
    getBookingsByFilter(userId: string, status: BookingStatus, search?: string): Promise<IBooking[]>;
    findBookingsForUserHistory(
        userId: string, 
        filters: { status?: BookingStatus, search?: string }, 
    ): Promise<{ bookings: IBookingHistoryPage[], total: number }>;
    getBookingStatusCounts(userId: string, search?: string): Promise<IBookingStatusCount[]>;
    findBookingsForProvider(
        providerId: string, 
        filters: { status?: BookingStatus, search?: string }, 
        page: number, 
        limit: number
    ): Promise<{ bookings: IProviderBookingManagement[], total: number }>;
    getBookingStatusCountsForProvider(providerId: string, search?: string): Promise<IBookingStatusCount[]>;
    countInDateRange(startDate: Date, endDate: Date): Promise<number>;
    
}