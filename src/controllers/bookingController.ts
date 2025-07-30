import { inject, injectable } from "inversify";
import { IBookingService } from "../services/interface/IBookingService";
import TYPES from "../di/type";
import { NextFunction, Request, Response } from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode";

@injectable()
export class BookingController {
    private bookingService: IBookingService
    constructor(@inject(TYPES.BookingService) bookingService: IBookingService){
        this.bookingService = bookingService
    }

    public createBooking = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const response = await this.bookingService.createNewBooking(req.body)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }
}