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
exports.SubscriptionPlanService = void 0;
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../../di/type"));
const CustomError_1 = require("../../utils/CustomError");
const ErrorMessage_1 = require("../../enums/ErrorMessage");
const HttpStatusCode_1 = require("../../enums/HttpStatusCode");
const subscription_mapper_1 = require("../../utils/mappers/subscription.mapper");
const subscription_enum_1 = require("../../enums/subscription.enum");
const razorpay_1 = require("../../utils/razorpay");
const provider_mapper_1 = require("../../utils/mappers/provider.mapper");
const mongoose_1 = require("mongoose");
let SubscriptionPlanService = class SubscriptionPlanService {
    constructor(subscriptionPlanRepository, providerRepository) {
        this._subscriptionPlanRepository = subscriptionPlanRepository;
        this._providerRepository = providerRepository;
    }
    createSubscriptionPlan(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const name = data.name.charAt(0).toUpperCase() + data.name.slice(1).toLowerCase();
            const plan = yield this._subscriptionPlanRepository.findOne({ name });
            if (plan) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.PLAN_ALREADY_EXITS, HttpStatusCode_1.HttpStatusCode.CONFLICT);
            }
            const dataPlan = Object.assign(Object.assign({}, data), { name });
            yield this._subscriptionPlanRepository.create(dataPlan);
        });
    }
    getSubscriptionPlan(search) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = {};
            if (search) {
                filter.name = { $regex: search, $options: 'i' };
            }
            const plans = yield this._subscriptionPlanRepository.findAll(filter);
            if (!plans || plans.length <= 0) {
                return [];
            }
            return (0, subscription_mapper_1.toAdminSubscriptionPlanList)(plans);
        });
    }
    updateSubscriptionPlan(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const name = data.name.charAt(0).toUpperCase() + data.name.slice(1).toLowerCase();
            const plan = yield this._subscriptionPlanRepository.findOne({ _id: { $ne: data.id } });
            if (plan && plan.name === name) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.PLAN_ALREADY_EXITS, HttpStatusCode_1.HttpStatusCode.CONFLICT);
            }
            const dataPlan = Object.assign(Object.assign({}, data), { name });
            yield this._subscriptionPlanRepository.update(dataPlan.id, dataPlan);
        });
    }
    deleteSubscriptionPlan(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const plan = yield this._subscriptionPlanRepository.findById(id);
            if (!plan) {
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.PLAN_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            yield this._subscriptionPlanRepository.delete(id);
        });
    }
    scheduleDowngrade(userId, newPlanId) {
        return __awaiter(this, void 0, void 0, function* () {
            const providerId = yield this._providerRepository.getProviderId(userId);
            const [provider, newPlan] = yield Promise.all([
                this._providerRepository.findById(providerId),
                this._subscriptionPlanRepository.findById(newPlanId)
            ]);
            if (!provider)
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.PROVIDER_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            if (!newPlan)
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.PLAN_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            if (!provider.subscription || provider.subscription.status !== subscription_enum_1.SubscriptionStatus.ACTIVE) {
                throw new CustomError_1.CustomError("No active subscription to downgrade.", HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            const currentPlan = yield this._subscriptionPlanRepository.findById(provider.subscription.planId.toString());
            if (!currentPlan)
                throw new CustomError_1.CustomError("Current plan not found.", HttpStatusCode_1.HttpStatusCode.INTERNAL_SERVER_ERROR);
            if (newPlan.price >= currentPlan.price) {
                throw new CustomError_1.CustomError("This is not a downgrade. Please use the Upgrade or Subscribe flow.", HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            provider.subscription.pendingDowngradePlanId = new mongoose_1.Types.ObjectId(newPlanId);
            const updatedProvider = yield provider.save();
            return updatedProvider.subscription;
        });
    }
    cancelDowngrade(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const providerId = yield this._providerRepository.getProviderId(userId);
            const provider = yield this._providerRepository.findById(providerId);
            if (!provider)
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.PROVIDER_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            if (!provider.subscription) {
                throw new CustomError_1.CustomError("No subscription found.", HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            if (!provider.subscription.pendingDowngradePlanId) {
                throw new CustomError_1.CustomError("No pending downgrade to cancel.", HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            provider.subscription.pendingDowngradePlanId = undefined;
            const updatedProvider = yield provider.save();
            return updatedProvider.subscription;
        });
    }
    checkAndExpire(providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = yield this._providerRepository.findById(providerId);
            if (!provider)
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.PROVIDER_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            const subscription = provider.subscription;
            if (!subscription) {
                return { status: subscription_enum_1.SubscriptionStatus.NONE };
            }
            if (subscription.status === subscription_enum_1.SubscriptionStatus.ACTIVE &&
                subscription.endDate &&
                new Date(subscription.endDate) < new Date()) {
                if (subscription.pendingDowngradePlanId) {
                    const newPlan = yield this._subscriptionPlanRepository.findById(subscription.pendingDowngradePlanId.toString());
                    if (newPlan) {
                        const newStartDate = new Date();
                        const newEndDate = new Date(newStartDate);
                        newEndDate.setDate(newEndDate.getDate() + newPlan.durationInDays);
                        subscription.planId = newPlan._id;
                        subscription.startDate = newStartDate;
                        subscription.endDate = newEndDate;
                        subscription.status = subscription_enum_1.SubscriptionStatus.ACTIVE;
                        subscription.pendingDowngradePlanId = undefined;
                        yield provider.save();
                        return provider.subscription;
                    }
                }
                subscription.status = subscription_enum_1.SubscriptionStatus.EXPIRED;
                subscription.pendingDowngradePlanId = undefined;
                yield provider.save();
            }
            return provider.subscription;
        });
    }
    createSubscriptionOrder(providerId, planId) {
        return __awaiter(this, void 0, void 0, function* () {
            const plan = yield this._subscriptionPlanRepository.findById(planId);
            if (!plan)
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.PLAN_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            const order = yield (0, razorpay_1.paymentCreation)(plan.price);
            return {
                order: Object.assign(Object.assign({}, order), { entity: "order" }),
                plan
            };
        });
    }
    ;
    calculateUpgradeCost(userId, newPlanId) {
        return __awaiter(this, void 0, void 0, function* () {
            const providerId = yield this._providerRepository.getProviderId(userId);
            const [provider, newPlan] = yield Promise.all([
                this._providerRepository.findById(providerId),
                this._subscriptionPlanRepository.findById(newPlanId)
            ]);
            if (!provider)
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.PROVIDER_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            if (!newPlan)
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.PLAN_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            const sub = provider.subscription;
            if (!sub || !sub.planId || !sub.endDate || sub.status !== subscription_enum_1.SubscriptionStatus.ACTIVE) {
                throw new CustomError_1.CustomError("No active subscription found. Please use the standard subscribe method.", HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            const currentPlan = yield this._subscriptionPlanRepository.findById(sub.planId.toString());
            if (!currentPlan)
                throw new CustomError_1.CustomError("Current plan not found.", HttpStatusCode_1.HttpStatusCode.INTERNAL_SERVER_ERROR);
            if (newPlan.price <= currentPlan.price) {
                throw new CustomError_1.CustomError("This is a downgrade or same plan. Downgrades will be supported in a future update.", HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            const today = new Date();
            const endDate = new Date(sub.endDate);
            if (today >= endDate) {
                throw new CustomError_1.CustomError("Your plan is expired. Please create a new subscription.", HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            const msInDay = 1000 * 60 * 60 * 24;
            const daysRemaining = Math.max(0, (endDate.getTime() - today.getTime()) / msInDay);
            const perDayCost = currentPlan.price / currentPlan.durationInDays;
            const remainingValue = perDayCost * daysRemaining;
            const costToPay = Math.max(1, newPlan.price - remainingValue);
            const finalAmountInRupees = Math.round(costToPay);
            const order = yield (0, razorpay_1.paymentCreation)(finalAmountInRupees);
            return {
                order: Object.assign(Object.assign({}, order), { entity: "order" }),
                newPlan: newPlan,
                oldPlanValue: Math.round(remainingValue),
                newPlanPrice: newPlan.price,
                finalAmount: finalAmountInRupees
            };
        });
    }
    verifySubscriptionPayment(providerId, planId, razorpay_order_id, razorpay_payment_id, razorpay_signature) {
        return __awaiter(this, void 0, void 0, function* () {
            const isValid = (0, razorpay_1.verifyPaymentSignature)(razorpay_order_id, razorpay_payment_id, razorpay_signature);
            if (!isValid) {
                throw new CustomError_1.CustomError("invalid signature", HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            }
            const plan = yield this._subscriptionPlanRepository.findById(planId);
            if (!plan)
                throw new CustomError_1.CustomError(ErrorMessage_1.ErrorMessage.PLAN_NOT_FOUND, HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + plan.durationInDays);
            const provider = yield this._providerRepository.update(providerId, {
                subscription: {
                    status: "ACTIVE",
                    planId,
                    startDate,
                    endDate,
                },
            });
            return {
                message: "Payment verified, subscription activated",
                provider: (0, provider_mapper_1.toProviderDTO)(provider)
            };
        });
    }
    ;
};
exports.SubscriptionPlanService = SubscriptionPlanService;
exports.SubscriptionPlanService = SubscriptionPlanService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.SubscriptionPlanRepository)),
    __param(1, (0, inversify_1.inject)(type_1.default.ProviderRepository)),
    __metadata("design:paramtypes", [Object, Object])
], SubscriptionPlanService);
