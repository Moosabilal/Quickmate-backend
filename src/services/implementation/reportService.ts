import { inject, injectable } from "inversify";
import { type IReportService } from "../interface/IReportService.js";
import { type IReportRepository } from "../../repositories/interface/IReportRepository.js";
import { type IBookingRepository } from "../../repositories/interface/IBookingRepository.js";
import TYPES from "../../di/type.js";
import { type IReport } from "../../models/Report.js";
import { CustomError } from "../../utils/CustomError.js";
import { HttpStatusCode } from "../../enums/HttpStatusCode.js";
import type { IReportResponse } from "../../interface/report.js";

@injectable()
export class ReportService implements IReportService {
  constructor(
    @inject(TYPES.ReportRepository) private _reportRepository: IReportRepository,
    @inject(TYPES.BookingRepository) private _bookingRepository: IBookingRepository,
  ) {}

  async createReport(userId: string, bookingId: string, reason: string, description: string): Promise<IReport> {
    const booking = await this._bookingRepository.findById(bookingId);
    if (!booking) {
      throw new CustomError("Booking not found", HttpStatusCode.NOT_FOUND);
    }

    if (booking.userId?.toString() !== userId) {
      throw new CustomError("Unauthorized: This booking does not belong to you", HttpStatusCode.UNAUTHORIZED);
    }

    const existingReport = await this._reportRepository.findByBookingId(bookingId);
    if (existingReport) {
      throw new CustomError("A report already exists for this booking", HttpStatusCode.BAD_REQUEST);
    }

    return this._reportRepository.create({
      bookingId: booking._id,
      userId: booking.userId,
      providerId: booking.providerId,
      reason,
      description,
      status: "PENDING",
    });
  }

  async getUserReports(userId: string): Promise<IReportResponse[]> {
    const reports = await this._reportRepository.findAllUserReportsWithPopulate(userId);
    return reports.map((report) => {
      const reportObj = report.toObject() as unknown as IReportResponse;

      if (reportObj.adminFeedback) {
        reportObj.adminReply = reportObj.adminFeedback;
      }

      if (reportObj.bookingId) {
        if (reportObj.bookingId.paymentId?.razorpay_order_id) {
          reportObj.bookingId.bookedOrderId = reportObj.bookingId.paymentId.razorpay_order_id;
        }
      }

      return reportObj;
    });
  }

  async getAllReports(page: number, limit: number): Promise<{ reports: IReportResponse[]; total: number }> {
    const { reports, total } = await this._reportRepository.findAllWithPopulate(page, limit);
    const mappedReports = reports.map((report) => {
      const reportObj = report.toObject() as unknown as IReportResponse;
      if (reportObj.adminFeedback) {
        reportObj.adminReply = reportObj.adminFeedback;
      }
      if (reportObj.bookingId) {
        if (reportObj.bookingId.paymentId?.razorpay_order_id) {
          reportObj.bookingId.bookedOrderId = reportObj.bookingId.paymentId.razorpay_order_id;
        }
      }
      return reportObj;
    });
    return { reports: mappedReports, total };
  }

  async getReportById(reportId: string): Promise<IReport | null> {
    return this._reportRepository.findById(reportId);
  }

  async updateReportStatus(reportId: string, status: string, adminFeedback?: string): Promise<IReport | null> {
    const updateData: Partial<IReport> = { status };
    if (adminFeedback !== undefined) {
      updateData.adminFeedback = adminFeedback;
    }
    return this._reportRepository.update(reportId, updateData);
  }
}
