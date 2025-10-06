import { FilterQuery } from "mongoose";
import { IBookingRequest } from "../../interface/booking.dto";
import { IBooking } from "../../models/Booking";
import { IBaseRepository } from "./base/IBaseRepository";

export interface IBookingRepository extends IBaseRepository<IBooking> {
    getDailyBookingCount(filter?: FilterQuery<IBooking>): Promise<{ date: string; total: number }[]>;
    findByProviderAndDateRange(providerId: string, startDate: string, endDate: string, statuses?: string[]): Promise<IBooking[]>;
}