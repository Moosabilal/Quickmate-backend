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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletController = void 0;
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../di/type"));
const HttpStatusCode_1 = require("../enums/HttpStatusCode");
const zod_1 = require("zod");
const wallet_validation_1 = require("../utils/validations/wallet.validation");
let WalletController = class WalletController {
    constructor(walletService) {
        this.getWallet = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const _a = wallet_validation_1.getWalletQuerySchema.parse(req.query), { page = 1, limit = 10 } = _a, filters = __rest(_a, ["page", "limit"]);
                const userId = req.user.id;
                const ownerType = req.user.role;
                const data = yield this._walletService.getSummary(userId, ownerType, filters, page, limit);
                res.json({ success: true, data });
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                next(error);
            }
        });
        this.initiateDeposit = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { amount } = wallet_validation_1.initiateDepositSchema.parse(req.body);
                const response = yield this._walletService.initiateDeposit(amount);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                next(error);
            }
        });
        this.verifyDeposit = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const validatedBody = wallet_validation_1.verifyDepositSchema.parse(req.body);
                const data = Object.assign(Object.assign({}, validatedBody), { userId: req.user.id, ownerType: req.user.role });
                const response = yield this._walletService.verifyDeposit(data);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                next(error);
            }
        });
        this._walletService = walletService;
    }
};
exports.WalletController = WalletController;
exports.WalletController = WalletController = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.WalletService)),
    __metadata("design:paramtypes", [Object])
], WalletController);
