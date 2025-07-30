import { IBookingRequest } from "../../dto/booking.dto";
import { IBooking } from "../../models/Booking";

export interface IBookingRepository {
    saveBooking(data: IBookingRequest): Promise<IBooking>;
}