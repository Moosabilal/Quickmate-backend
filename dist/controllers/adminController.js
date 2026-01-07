var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { inject, injectable } from "inversify";
import TYPES from "../di/type";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { changePasswordSchema } from "../utils/validations/admin.validation";
import { ZodError } from "zod";
let AdminController = class AdminController {
    _adminService;
    constructor(adminService) {
        this._adminService = adminService;
    }
    getAdminDashboard = async (req, res, next) => {
        try {
            const response = await this._adminService.getAdminDashboard();
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
    getDashboardAnalytics = async (req, res, next) => {
        try {
            const response = await this._adminService.getDashboardAnalytics();
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: "Analytics data fetched successfully",
                data: response,
            });
        }
        catch (error) {
            next(error);
        }
    };
    changePassword = async (req, res, next) => {
        try {
            const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
            const userId = req.user.id;
            await this._adminService.changePassword(userId, currentPassword, newPassword);
            res.status(HttpStatusCode.OK).json({ success: true, message: "Password updated successfully." });
        }
        catch (error) {
            if (error instanceof ZodError) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            }
            next(error);
        }
    };
};
AdminController = __decorate([
    injectable(),
    __param(0, inject(TYPES.AdminService)),
    __metadata("design:paramtypes", [Object])
], AdminController);
export { AdminController };
