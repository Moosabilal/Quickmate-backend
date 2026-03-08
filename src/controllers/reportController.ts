import { inject, injectable } from "inversify";
import { type Response } from "express";
import { type IReportService } from "../services/interface/IReportService.js";
import { type IAdminResolutionService } from "../services/interface/IAdminResolutionService.js";
import TYPES from "../di/type.js";
import { type AuthRequest } from "../middleware/authMiddleware.js";
import { HttpStatusCode } from "../enums/HttpStatusCode.js";

@injectable()
export class ReportController {
  constructor(
    @inject(TYPES.ReportService) private _reportService: IReportService,
    @inject(TYPES.AdminResolutionService) private _adminResolutionService: IAdminResolutionService,
  ) {}

  public createReport = async (req: AuthRequest, res: Response) => {
    try {
      const { bookingId, reason, description } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(HttpStatusCode.UNAUTHORIZED).json({ success: false, message: "Unauthorized" });
      }

      const report = await this._reportService.createReport(userId, bookingId, reason, description);

      res.status(HttpStatusCode.CREATED).json({
        success: true,
        message: "Report submitted successfully",
        report,
      });
    } catch (error) {
      res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  };

  public getReportsForAdmin = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const { reports, total } = await this._reportService.getAllReports(page, limit);

      res.status(HttpStatusCode.OK).json({
        success: true,
        reports,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalReports: total,
      });
    } catch (error) {
      res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  };

  public updateReportStatus = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { adminFeedback, adminReply, resolutionType, newProviderId } = req.body;
      let { status } = req.body;

      if (status) {
        status = status.toUpperCase().replace(/\s+/g, "_");
      }

      const feedback = adminFeedback || adminReply;

      const validStatuses = ["PENDING", "UNDER_REVIEW", "RESOLVED", "DISMISSED"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, message: "Invalid status" });
      }

      if (status === "RESOLVED") {
        if (resolutionType === "refund") {
          await this._adminResolutionService.processRefund(id, feedback);
        } else if (resolutionType === "correction") {
          await this._adminResolutionService.assignCorrectionProvider(id, feedback, newProviderId);
        } else {
          await this._reportService.updateReportStatus(id, status, feedback);
        }
      } else if (status === "DISMISSED") {
        await this._adminResolutionService.dismissReport(id, feedback);
      } else {
        await this._reportService.updateReportStatus(id, status, feedback);
      }

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: `Report marked as ${status} successfully`,
      });
    } catch (error) {
      res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  };

  public getReportsForUser = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(HttpStatusCode.UNAUTHORIZED).json({ success: false, message: "Unauthorized" });
      }

      const reports = await this._reportService.getUserReports(userId);

      res.status(HttpStatusCode.OK).json({
        success: true,
        reports,
      });
    } catch (error) {
      res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  };

  public scheduleUserRework = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { scheduledDate, scheduledTime } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(HttpStatusCode.UNAUTHORIZED).json({ success: false, message: "Unauthorized" });
      }

      const reworkBooking = await this._adminResolutionService.scheduleUserRework(
        userId,
        id,
        scheduledDate,
        scheduledTime,
      );

      res.status(HttpStatusCode.CREATED).json({
        success: true,
        message: "Rework session scheduled successfully",
        reworkBooking,
      });
    } catch (error) {
      res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  };
}
