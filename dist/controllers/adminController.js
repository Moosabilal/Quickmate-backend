"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../di/type"));
const HttpStatusCode_1 = require("../enums/HttpStatusCode");
const admin_validation_1 = require("../utils/validations/admin.validation");
const zod_1 = require("zod");
let AdminController = class AdminController {
    constructor(adminService) {
        this.getAdminDashboard = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this._adminService.getAdminDashboard();
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.getDashboardAnalytics = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this._adminService.getDashboardAnalytics();
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({
                    success: true,
                    message: "Analytics data fetched successfully",
                    data: response
                });
            }
            catch (error) {
                next(error);
            }
        });
        this.changePassword = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { currentPassword, newPassword } = admin_validation_1.changePasswordSchema.parse(req.body);
                const userId = req.user.id;
                yield this._adminService.changePassword(userId, currentPassword, newPassword);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({ success: true, message: "Password updated successfully." });
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                }
                next(error);
            }
        });
        this._adminService = adminService;
    }
};
exports.AdminController = AdminController;
exports.AdminController = AdminController = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.AdminService)),
    __metadata("design:paramtypes", [Object])
], AdminController);
