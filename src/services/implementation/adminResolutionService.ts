import { inject, injectable } from "inversify";
import mongoose, { Types } from "mongoose";
import { type IAdminResolutionService } from "../interface/IAdminResolutionService.js";
import { type IReportRepository } from "../../repositories/interface/IReportRepository.js";
import { type IBookingRepository } from "../../repositories/interface/IBookingRepository.js";
import { type IWalletRepository } from "../../repositories/interface/IWalletRepository.js";
import { type IProviderRepository } from "../../repositories/interface/IProviderRepository.js";
import { type IPaymentRepository } from "../../repositories/interface/IPaymentRepository.js";
import TYPES from "../../di/type.js";
import { TransactionStatus } from "../../enums/payment&wallet.enum.js";
import { BookingStatus, WarrantyStatus } from "../../enums/booking.enum.js";
import { CustomError } from "../../utils/CustomError.js";
import { HttpStatusCode } from "../../enums/HttpStatusCode.js";
import { PaymentStatus, Roles } from "../../enums/userRoles.js";
import type { IBooking } from "../../models/Booking.js";

@injectable()
export class AdminResolutionService implements IAdminResolutionService {
  constructor(
    @inject(TYPES.ReportRepository) private _reportRepository: IReportRepository,
    @inject(TYPES.BookingRepository) private _bookingRepository: IBookingRepository,
    @inject(TYPES.WalletRepository) private _walletRepository: IWalletRepository,
    @inject(TYPES.ProviderRepository) private _providerRepository: IProviderRepository,
    @inject(TYPES.PaymentRepository) private _paymentRepository: IPaymentRepository,
  ) {}

  async processRefund(reportId: string, adminFeedback: string, refundAmount?: number): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const report = await this._reportRepository.findById(reportId);
      if (!report) throw new CustomError("Report not found", HttpStatusCode.NOT_FOUND);
      if (report.status === "RESOLVED" || report.status === "DISMISSED")
        throw new CustomError("Report already resolved or dismissed", HttpStatusCode.BAD_REQUEST);

      const booking = await this._bookingRepository.findById(report.bookingId.toString());
      if (!booking) throw new CustomError("Booking not found", HttpStatusCode.NOT_FOUND);

      let paymentId = booking.paymentId;
      let originalBooking = booking;

      if (!paymentId && booking.isWarrantyClaim && booking.parentBookingId) {
        const parent = await this._bookingRepository.findById(booking.parentBookingId.toString());
        if (parent) {
          paymentId = parent.paymentId;
          originalBooking = parent;
        }
      }

      if (!paymentId) {
        throw new CustomError("Payment record not found for this refund", HttpStatusCode.BAD_REQUEST);
      }

      if (originalBooking.paymentStatus === PaymentStatus.REFUNDED) {
        throw new CustomError("This booking chain has already been refunded", HttpStatusCode.BAD_REQUEST);
      }

      const payment = await this._paymentRepository.findById(paymentId.toString());
      if (!payment) {
        throw new CustomError("Payment record not found", HttpStatusCode.NOT_FOUND);
      }

      const refundToUser = refundAmount !== undefined ? refundAmount : payment.amount;
      const deductFromProvider = refundAmount !== undefined ? refundAmount : payment.providerAmount;

      const provider = await this._providerRepository.findById(report.providerId.toString());
      if (!provider) throw new CustomError("Provider not found", HttpStatusCode.NOT_FOUND);

      const providerWallet = await this._walletRepository.findOne({ ownerId: provider.userId.toString() });
      if (providerWallet) {
        const updatedPendingBalance = providerWallet.pendingBalance - deductFromProvider;
        await this._walletRepository.update(
          providerWallet._id.toString(),
          { pendingBalance: updatedPendingBalance },
          { session },
        );

        const updatedEarnings = provider.earnings - deductFromProvider;
        await this._providerRepository.update(provider._id.toString(), { earnings: updatedEarnings }, { session });
      }

      const providerWalletId =
        providerWallet?._id || (await this._walletRepository.findOne({ ownerId: provider.userId.toString() }))?._id;
      if (providerWalletId) {
        await this._walletRepository.createTransaction(
          {
            walletId: providerWalletId,
            transactionType: "debit",
            source: "refund_penalty",
            remarks: `Refund Penalty for Booking #${booking._id.toString().slice(-6)}`,
            amount: deductFromProvider,
            status: TransactionStatus.REFUND,
            description: `Deduction for User Refund (Report Resolution)`,
          },
          session,
        );
      }

      let userWallet = await this._walletRepository.findOne({ ownerId: report.userId.toString() });
      if (!userWallet) {
        userWallet = await this._walletRepository.create(
          {
            balance: refundToUser,
            ownerId: new Types.ObjectId(report.userId.toString()),
            ownerType: Roles.USER,
          },
          session,
        );
      } else {
        const updatedBalance = userWallet.balance + refundToUser;
        await this._walletRepository.update(userWallet._id.toString(), { balance: updatedBalance }, { session });
      }

      await this._walletRepository.createTransaction(
        {
          walletId: userWallet._id,
          transactionType: "credit",
          source: "refund",
          remarks: `Refund for Booking #${booking._id.toString().slice(-6)}`,
          amount: refundToUser,
          status: TransactionStatus.REFUND,
          description: `Admin Refund for Report resolution`,
        },
        session,
      );

      report.status = "RESOLVED";
      report.adminFeedback = adminFeedback;
      await report.save({ session });

      await this._bookingRepository.update(
        originalBooking._id.toString(),
        {
          paymentStatus: PaymentStatus.REFUNDED,
          warrantyStatus: WarrantyStatus.CLAIMED,
        },
        { session },
      );

      if (booking._id.toString() !== originalBooking._id.toString()) {
        await this._bookingRepository.update(
          booking._id.toString(),
          {
            warrantyStatus: WarrantyStatus.CLAIMED,
          },
          { session },
        );
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async assignCorrectionProvider(reportId: string, adminFeedback: string, newProviderId?: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const report = await this._reportRepository.findById(reportId);
      if (!report) throw new CustomError("Report not found", HttpStatusCode.NOT_FOUND);
      if (report.status === "RESOLVED" || report.status === "DISMISSED") {
        throw new CustomError("Report already resolved or dismissed", HttpStatusCode.BAD_REQUEST);
      }

      const booking = await this._bookingRepository.findById(report.bookingId.toString());
      if (!booking) throw new CustomError("Booking not found", HttpStatusCode.NOT_FOUND);

      let originalBooking = booking;
      if (!booking.paymentId && booking.isWarrantyClaim && booking.parentBookingId) {
        const parent = await this._bookingRepository.findById(booking.parentBookingId.toString());
        if (parent) originalBooking = parent;
      }

      if (originalBooking.paymentStatus === PaymentStatus.REFUNDED) {
        throw new CustomError("Cannot assign rework to a refunded booking chain", HttpStatusCode.BAD_REQUEST);
      }

      const paymentId = originalBooking.paymentId;
      if (!paymentId) throw new CustomError("Original payment not found", HttpStatusCode.BAD_REQUEST);

      const payment = await this._paymentRepository.findById(paymentId.toString());
      if (!payment) throw new CustomError("Payment record not found", HttpStatusCode.NOT_FOUND);

      const penaltyAmount = payment.providerAmount;

      const provider = await this._providerRepository.findById(report.providerId.toString());
      if (!provider) throw new CustomError("Provider not found", HttpStatusCode.NOT_FOUND);

      const providerWallet = await this._walletRepository.findOne({ ownerId: provider.userId.toString() });
      if (providerWallet) {
        const updatedPendingBalance = providerWallet.pendingBalance - penaltyAmount;
        await this._walletRepository.update(
          providerWallet._id.toString(),
          { pendingBalance: updatedPendingBalance },
          { session },
        );

        const updatedEarnings = provider.earnings - penaltyAmount;
        await this._providerRepository.update(provider._id.toString(), { earnings: updatedEarnings }, { session });

        await this._walletRepository.createTransaction(
          {
            walletId: providerWallet._id,
            transactionType: "debit",
            source: "refund_penalty",
            remarks: `Rework Penalty for Booking #${originalBooking._id.toString().slice(-6)}`,
            amount: penaltyAmount,
            status: TransactionStatus.REFUND,
            description: `Penalty for failed service (Report Resolution)`,
          },
          session,
        );
      }

      report.status = "RESOLVED";
      report.adminFeedback = adminFeedback;
      report.assignedReworkProviderId = newProviderId || originalBooking.providerId;
      await report.save({ session });

      originalBooking.warrantyStatus = WarrantyStatus.CLAIMED;
      await this._bookingRepository.update(
        originalBooking._id.toString(),
        { warrantyStatus: WarrantyStatus.CLAIMED },
        { session },
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async dismissReport(reportId: string, adminFeedback: string): Promise<void> {
    const report = await this._reportRepository.findById(reportId);
    if (!report) throw new CustomError("Report not found", HttpStatusCode.NOT_FOUND);
    if (report.status === "RESOLVED" || report.status === "DISMISSED") {
      throw new CustomError("Report already resolved or dismissed", HttpStatusCode.BAD_REQUEST);
    }

    report.status = "DISMISSED";
    report.adminFeedback = adminFeedback;
    await report.save();
  }

  async scheduleUserRework(
    userId: string,
    reportId: string,
    scheduledDate: string,
    scheduledTime: string,
  ): Promise<IBooking> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const report = await this._reportRepository.findById(reportId);
      if (!report) throw new CustomError("Report not found", HttpStatusCode.NOT_FOUND);
      if (report.userId.toString() !== userId)
        throw new CustomError("Unauthorized access to this report", HttpStatusCode.FORBIDDEN);
      if (report.status !== "RESOLVED") throw new CustomError("Report is not resolved", HttpStatusCode.BAD_REQUEST);

      const rpt = report;
      if (!rpt.assignedReworkProviderId)
        throw new CustomError("No rework provider assigned to this report", HttpStatusCode.BAD_REQUEST);
      if (rpt.reworkBookingId)
        throw new CustomError("Rework session has already been scheduled", HttpStatusCode.BAD_REQUEST);

      const originalBooking = await this._bookingRepository.findById(report.bookingId.toString());
      if (!originalBooking) throw new CustomError("Original booking not found", HttpStatusCode.NOT_FOUND);

      const newBookingData = {
        userId: originalBooking.userId,
        serviceId: originalBooking.serviceId,
        providerId: rpt.assignedReworkProviderId,
        addressId: originalBooking.addressId,
        customerName: originalBooking.customerName,
        phone: originalBooking.phone,
        instructions: `WARRANTY REWORK: ${report.adminFeedback || "Report Resolved"}. Original Booking: ${originalBooking._id}`,
        amount: "0",
        status: BookingStatus.CONFIRMED,
        scheduledDate,
        scheduledTime,
        isWarrantyClaim: true,
        parentBookingId: originalBooking._id,
        paymentStatus: PaymentStatus.PAID,
      };

      const reworkBooking = await this._bookingRepository.create(newBookingData, session);

      rpt.reworkBookingId = reworkBooking._id;
      await rpt.save({ session });

      await session.commitTransaction();
      return reworkBooking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
