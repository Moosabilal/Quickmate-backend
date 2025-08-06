import { injectable } from "inversify";
import { IBookingRequest } from "../../dto/booking.dto";
import Booking, { IBooking } from "../../models/Booking";
import { IBookingRepository } from "../interface/IBookingRepository";

@injectable()
export class BookingRepository implements IBookingRepository {
    async saveBooking(data: IBookingRequest): Promise<IBooking> {
        const bookings = new Booking(data)
        return await bookings.save()
    }
}