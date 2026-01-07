import { inject, injectable } from "inversify";
import { type IAdminService } from "../services/interface/IAdminService";
import TYPES from "../di/type";
import { type AuthRequest } from "../middleware/authMiddleware";
import { type NextFunction, type Response } from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { changePasswordSchema } from "../utils/validations/admin.validation";
import { ZodError } from "zod";

@injectable()
export class AdminController {
  private _adminService: IAdminService;
  constructor(@inject(TYPES.AdminService) adminService: IAdminService) {
    this._adminService = adminService;
  }

  public getAdminDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const response = await this._adminService.getAdminDashboard();
      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getDashboardAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const response = await this._adminService.getDashboardAnalytics();
      res.status(HttpStatusCode.OK).json({
        success: true,
        message: "Analytics data fetched successfully",
        data: response,
      });
    } catch (error) {
      next(error);
    }
  };

  public changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      const userId = req.user.id;

      await this._adminService.changePassword(userId, currentPassword, newPassword);

      res.status(HttpStatusCode.OK).json({ success: true, message: "Password updated successfully." });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
      }
      next(error);
    }
  };
}
