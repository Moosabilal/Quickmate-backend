import { inject, injectable } from "inversify";
import { IAdminService } from "../services/interface/IAdminService";
import TYPES from "../di/type";
import { AuthRequest } from "../middleware/authMiddleware";
import { NextFunction, Response } from "express";

@injectable()
export class AdminController {
    private _adminService: IAdminService
    constructor(@inject(TYPES.AdminService) adminService: IAdminService) {
        this._adminService = adminService
    }

    public getAdminDashboard = async (req:AuthRequest, res: Response, next: NextFunction) => {
        try {
            const response = await this._adminService.getAdminDashboard()
            res.status(200).json(response)
        } catch (error) {
            next(error)
        }
    }
}