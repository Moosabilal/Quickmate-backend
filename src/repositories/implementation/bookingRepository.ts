import { injectable } from "inversify";
import { IBookingRequest } from "../../dto/booking.dto";
import Booking, { IBooking } from "../../models/Booking";
import { IBookingRepository } from "../interface/IBookingRepository";
import { BaseRepository } from "./base/BaseRepository";

@injectable()
export class BookingRepository extends BaseRepository<IBooking> implements IBookingRepository {
    constructor() {
        super(Booking)
    }
}