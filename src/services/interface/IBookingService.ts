import { IBookingRequest } from "../../dto/booking.dto";

export interface IBookingService {
    createNewBooking(data: IBookingRequest ): Promise<{message: string}>;
}