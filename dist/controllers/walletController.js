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
import {} from "../services/interface/IWalletService.js";
import TYPES from "../di/type.js";
import {} from "../middleware/authMiddleware.js";
import {} from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode.js";
import {} from "../enums/userRoles.js";
import { ZodError } from "zod";
import { getWalletQuerySchema, initiateDepositSchema, verifyDepositSchema, } from "../utils/validations/wallet.validation.js";
let WalletController = class WalletController {
    _walletService;
    constructor(walletService) {
        this._walletService = walletService;
    }
    getWallet = async (req, res, next) => {
        try {
            const { page = 1, limit = 10, ...filters } = getWalletQuerySchema.parse(req.query);
            const userId = req.user.id;
            const ownerType = req.user.role;
            const data = await this._walletService.getSummary(userId, ownerType, filters, page, limit);
            res.json({ success: true, data });
        }
        catch (error) {
            if (error instanceof ZodError)
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error);
        }
    };
    initiateDeposit = async (req, res, next) => {
        try {
            const { amount } = initiateDepositSchema.parse(req.body);
            const response = await this._walletService.initiateDeposit(amount);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            if (error instanceof ZodError)
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error);
        }
    };
    verifyDeposit = async (req, res, next) => {
        try {
            const validatedBody = verifyDepositSchema.parse(req.body);
            const data = {
                ...validatedBody,
                userId: req.user.id,
                ownerType: req.user.role,
            };
            const response = await this._walletService.verifyDeposit(data);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            if (error instanceof ZodError)
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error);
        }
    };
};
WalletController = __decorate([
    injectable(),
    __param(0, inject(TYPES.WalletService)),
    __metadata("design:paramtypes", [Object])
], WalletController);
export { WalletController };
