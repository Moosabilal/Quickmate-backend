import { FilterQuery } from "mongoose";
import { IBookingRequest } from "../../interface/booking.dto";
import { IBooking } from "../../models/Booking";
import { IBaseRepository } from "./base/IBaseRepository";

export interface IBookingRepository extends IBaseRepository<IBooking> {
    countBookings(filter?: FilterQuery<IBooking>): Promise<number>
}