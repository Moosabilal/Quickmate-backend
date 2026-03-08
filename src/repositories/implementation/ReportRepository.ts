import { BaseRepository } from "./base/BaseRepository.js";
import { type IReportRepository } from "../interface/IReportRepository.js";
import Report, { type IReport } from "../../models/Report.js";

export class ReportRepository extends BaseRepository<IReport> implements IReportRepository {
  constructor() {
    super(Report);
  }

  async findByBookingId(bookingId: string): Promise<IReport | null> {
    return this.model.findOne({ bookingId }).exec();
  }

  async findAllWithPopulate(page: number, limit: number): Promise<{ reports: IReport[]; total: number }> {
    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      this.model
        .find()
        .populate("userId", "name email")
        .populate("providerId", "fullName email")
        .populate("bookingId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(),
    ]);

    return { reports, total };
  }

  async findAllUserReportsWithPopulate(userId: string): Promise<IReport[]> {
    return this.model
      .find({ userId })
      .populate("providerId", "fullName email profilePicture")
      .populate({
        path: "bookingId",
        select: "serviceId date time totalAmount status addressId paymentId",
        populate: [
          {
            path: "addressId",
            select: "locationCoords",
          },
          {
            path: "paymentId",
            select: "razorpay_order_id",
          },
        ],
      })
      .sort({ createdAt: -1 })
      .exec();
  }
}
