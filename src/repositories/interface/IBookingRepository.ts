import { type ClientSession, type FilterQuery } from "mongoose";
import {
  type IBookingHistoryPage,
  type IBookingStatusCount,
  type IPopulatedBookingForEarnings,
  type IProviderBookingManagement,
} from "../../interface/booking.js";
import { type BookingLean, type IBooking } from "../../models/Booking.js";
import { type IBaseRepository } from "./base/IBaseRepository.js";
import { type IServiceBreakdown } from "../../interface/provider.js";
import { type BookingStatus } from "../../enums/booking.enum.js";

export interface IBookingRepository extends IBaseRepository<IBooking> {
  getDailyBookingCount(filter?: FilterQuery<IBooking>): Promise<{ date: string; total: number }[]>;
  findByProviderAndDateRange(
    providerIds: string[],
    startDate: string,
    endDate: string,
    statuses?: string[],
  ): Promise<BookingLean[]>;
  findByProviderByTime(
    providerId: string,
    startDate: string,
    endDate: string,
    statuses?: string[],
  ): Promise<BookingLean[]>;
  findByProviderAndDateRangeForEarnings(
    providerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IPopulatedBookingForEarnings[]>;
  countUniqueClientsBeforeDate(providerId: string, date: Date): Promise<number>;
  hasPriorBooking(userId: string, providerId: string, beforeDate: Date): Promise<boolean>;
  getBookingStatsByService(providerId: string): Promise<IServiceBreakdown[]>;
  getBookingTrendsByMonth(months?: number): Promise<{ month: string; value: number }[]>;
  getBookingPatternsByDayOfWeek(): Promise<{ day: string; value: number }[]>;
  countTotalBookings(): Promise<number>;
  getTopServiceCategories(limit?: number): Promise<{ name: string; value: number }[]>;
  getBookingsByFilter(userId: string, status: BookingStatus, search?: string): Promise<IBooking[]>;
  findBookingsForUserHistory(
    userId: string,
    filters: { status?: BookingStatus; search?: string },
  ): Promise<{ bookings: IBookingHistoryPage[]; total: number }>;
  getBookingStatusCounts(userId: string, search?: string): Promise<IBookingStatusCount[]>;
  findBookingsForProvider(
    providerId: string,
    filters: { status?: BookingStatus; search?: string },
    page: number,
    limit: number,
  ): Promise<{ bookings: IProviderBookingManagement[]; total: number }>;
  getBookingStatusCountsForProvider(providerId: string, search?: string): Promise<IBookingStatusCount[]>;
  countInDateRange(startDate: Date, endDate: Date): Promise<number>;
  findOverdueBookings(cutoffDate: string): Promise<IBooking[]>;
  updateStatus(bookingId: string, status: BookingStatus): Promise<IBooking | null>;
  findByProviderAndDate(providerId: string, dateStr: string, session?: ClientSession): Promise<IBooking[]>;
}
