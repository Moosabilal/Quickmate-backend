import { inject, injectable } from "inversify";
import { IBookingRepository } from "../../repositories/interface/IBookingRepository";
import { IBookingService } from "../interface/IBookingService";
import TYPES from "../../di/type";
import { IBookingRequest } from "../../dto/booking.dto";

@injectable()
export class BookingService implements IBookingService {
    private bookingRepository: IBookingRepository
    constructor(@inject(TYPES.BookingRepository) bookingRepository: IBookingRepository){
        this.bookingRepository = bookingRepository
    }

    async createNewBooking(data: IBookingRequest ): Promise<{bookingId: string, message: string}>{
        const bookings = await this.bookingRepository.saveBooking(data)
        return {bookingId:(bookings._id as { toString(): string }).toString(), message: "your booking confirmed successfully"}
    }
}