import { type IReport } from "../../models/Report.js";
import { type IReportResponse } from "../../interface/report.js";

export interface IReportService {
  createReport(userId: string, bookingId: string, reason: string, description: string): Promise<IReport>;
  getUserReports(userId: string): Promise<IReportResponse[]>;
  getAllReports(page: number, limit: number): Promise<{ reports: IReportResponse[]; total: number }>;
  getReportById(reportId: string): Promise<IReport | null>;
  updateReportStatus(reportId: string, status: string, adminFeedback?: string): Promise<IReport | null>;
}
