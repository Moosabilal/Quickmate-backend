import type { IBooking } from "../../models/Booking.js";

export interface IAdminResolutionService {
  processRefund(reportId: string, adminFeedback: string, refundAmount?: number): Promise<void>;
  assignCorrectionProvider(reportId: string, adminFeedback: string, newProviderId?: string): Promise<void>;
  dismissReport(reportId: string, adminFeedback: string): Promise<void>;
  scheduleUserRework(userId: string, reportId: string, scheduledDate: string, scheduledTime: string): Promise<IBooking>;
}
