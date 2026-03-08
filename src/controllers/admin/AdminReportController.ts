import { inject, injectable } from "inversify";
import { type Request, type Response, type NextFunction } from "express";
import TYPES from "../../di/type.js";
import { type IAdminResolutionService } from "../../services/interface/IAdminResolutionService.js";
import { HttpStatusCode } from "../../enums/HttpStatusCode.js";

@injectable()
export class AdminReportController {
  constructor(@inject(TYPES.AdminResolutionService) private _adminResolutionService: IAdminResolutionService) {}

  public refundUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reportId } = req.params;
      const { refundAmount, adminFeedback } = req.body;

      await this._adminResolutionService.processRefund(reportId, adminFeedback || "Admin Refund", refundAmount);

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: "User refunded successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  public assignRework = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reportId } = req.params;
      const { newProviderId, adminFeedback } = req.body;

      await this._adminResolutionService.assignCorrectionProvider(
        reportId,
        adminFeedback || "Warranty Rework Assigned",
        newProviderId,
      );

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: "Rework assigned successfully",
      });
    } catch (error) {
      next(error);
    }
  };
}
