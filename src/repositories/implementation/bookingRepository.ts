import { injectable } from "inversify";
import { IBookingRequest } from "../../interface/booking.dto";
import Booking, { IBooking } from "../../models/Booking";
import { IBookingRepository } from "../interface/IBookingRepository";
import { BaseRepository } from "./base/BaseRepository";
import { FilterQuery } from "mongoose";

@injectable()
export class BookingRepository extends BaseRepository<IBooking> implements IBookingRepository {
    constructor() {
        super(Booking)
    }

    async countBookings(filter: FilterQuery<IBooking>): Promise<number> {
        return await Booking.countDocuments(filter)
    }
}