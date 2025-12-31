"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.SubscriptionPlanController = void 0;
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../di/type"));
const HttpStatusCode_1 = require("../enums/HttpStatusCode");
const zod_1 = __importStar(require("zod"));
const subscription_validation_1 = require("../utils/validations/subscription.validation");
let SubscriptionPlanController = class SubscriptionPlanController {
    constructor(subscriptionPlanService) {
        this.createSubscriptionPlan = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const validatedBody = subscription_validation_1.createSubscriptionPlanSchema.parse(req.body);
                yield this._subscriptionPlanService.createSubscriptionPlan(req.body);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json();
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                next(error);
            }
        });
        this.getSubscriptionPlan = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { search } = subscription_validation_1.getSubscriptionPlanQuerySchema.parse(req.query);
                const response = yield this._subscriptionPlanService.getSubscriptionPlan(search);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this.updateSubscriptionPlan = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const validatedBody = subscription_validation_1.updateSubscriptionPlanSchema.parse(req.body);
                yield this._subscriptionPlanService.updateSubscriptionPlan(req.body);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json();
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                next(error);
            }
        });
        this.deleteSubscriptionPlan = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = subscription_validation_1.paramIdSchema.parse(req.params);
                yield this._subscriptionPlanService.deleteSubscriptionPlan(id);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json();
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                next(error);
            }
        });
        this.checkProviderSubscription = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { providerId } = subscription_validation_1.providerIdParamSchema.parse(req.params);
                const subscription = yield this._subscriptionPlanService.checkAndExpire(providerId);
                res.json(subscription);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                res.status(400).json({ message: error.message });
            }
        });
        this.createSubscriptionOrder = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { providerId, planId } = subscription_validation_1.createSubscriptionOrderSchema.parse(req.body);
                const response = yield this._subscriptionPlanService.createSubscriptionOrder(providerId, planId);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                next(error);
            }
        });
        this.calculateUpgrade = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { newPlanId } = subscription_validation_1.calculateUpgradeSchema.parse(req.body);
                const userId = req.user.id;
                const response = yield this._subscriptionPlanService.calculateUpgradeCost(userId, newPlanId);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({ success: true, data: response });
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                next(error);
            }
        });
        this.scheduleDowngrade = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { newPlanId } = zod_1.default.object({ newPlanId: subscription_validation_1.paramIdSchema.shape.id }).parse(req.body);
                const userId = req.user.id;
                const updatedSubscription = yield this._subscriptionPlanService.scheduleDowngrade(userId, newPlanId);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({
                    success: true,
                    message: "Downgrade scheduled successfully.",
                    data: updatedSubscription
                });
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                next(error);
            }
        });
        this.cancelDowngrade = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const updatedSubscription = yield this._subscriptionPlanService.cancelDowngrade(userId);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({
                    success: true,
                    message: "Your scheduled downgrade has been cancelled.",
                    data: updatedSubscription
                });
            }
            catch (error) {
                next(error);
            }
        });
        this.verifySubscriptionPayment = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { providerId, planId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = subscription_validation_1.verifySubscriptionPaymentSchema.parse(req.body);
                const response = yield this._subscriptionPlanService.verifySubscriptionPayment(providerId, planId, razorpay_order_id, razorpay_payment_id, razorpay_signature);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError)
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                next(error);
            }
        });
        this._subscriptionPlanService = subscriptionPlanService;
    }
};
exports.SubscriptionPlanController = SubscriptionPlanController;
exports.SubscriptionPlanController = SubscriptionPlanController = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.SubscriptionPlanService)),
    __metadata("design:paramtypes", [Object])
], SubscriptionPlanController);
