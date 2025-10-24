import { injectable } from "inversify";
import Payment, { IPayment} from "../../models/payment";
import { IPaymentRepository } from "../interface/IPaymentRepository";
import { BaseRepository } from "./base/BaseRepository";
import { BookingStatus } from "../../enums/booking.enum";


@injectable()
export class PaymentRepository extends BaseRepository<IPayment> implements IPaymentRepository {
    constructor() {
        super(Payment)
    }

    async getMonthlyAdminRevenue(): Promise<{ month: string; total: number }[]> {
        const result = await Payment.aggregate([
            {
                $lookup: {
                    from: "bookings",
                    localField: "bookingId",
                    foreignField: "_id",
                    as: "booking"
                }
            },
            { $unwind: "$booking" },
            {
                $match: {
                    "booking.status": BookingStatus.COMPLETED
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$paymentDate" },
                        month: { $month: "$paymentDate" }
                    },
                    total: { $sum: "$adminCommission" }
                }
            },
            {
                $project: {
                    _id: 0,
                    year: "$_id.year",
                    month: "$_id.month",
                    total: 1
                }
            },
            { $sort: { year: 1, month: 1 } }
        ]);

        return result.map(r => ({
            month: `${r.year}-${String(r.month).padStart(2, "0")}`,
            total: r.total
        }));
    }

    public async getTotalRevenue(): Promise<number> {
        const result = await this.model.aggregate([
            { $match: { adminCommission: { $exists: true, $ne: null } } },
            { $group: { _id: null, totalRevenue: { $sum: '$adminCommission' } } }
        ]);
        return result[0]?.totalRevenue || 0;
    }

    // async createPayment(data: IPaymentCreationData): Promise<IPayment> {
    //     const dataForDb = {
    //         ...data,
    //         userId: data.userId,
    //         providerId: data.providerId,
    //         bookingId: data.bookingId,
    //     };
    //     return await this.create(dataForDb);
    // }

}