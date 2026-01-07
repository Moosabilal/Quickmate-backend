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
import TYPES from "../../di/type";
import { CustomError } from "../../utils/CustomError";
import { ErrorMessage } from "../../enums/ErrorMessage";
import { HttpStatusCode } from "../../enums/HttpStatusCode";
import { toAdminSubscriptionPlanList } from "../../utils/mappers/subscription.mapper";
import { SubscriptionStatus } from "../../enums/subscription.enum";
import { paymentCreation, verifyPaymentSignature } from "../../utils/razorpay";
import { toProviderDTO } from "../../utils/mappers/provider.mapper";
import { Types } from "mongoose";
let SubscriptionPlanService = class SubscriptionPlanService {
    _subscriptionPlanRepository;
    _providerRepository;
    constructor(subscriptionPlanRepository, providerRepository) {
        this._subscriptionPlanRepository = subscriptionPlanRepository;
        this._providerRepository = providerRepository;
    }
    async createSubscriptionPlan(data) {
        const name = data.name.charAt(0).toUpperCase() + data.name.slice(1).toLowerCase();
        const plan = await this._subscriptionPlanRepository.findOne({ name });
        if (plan) {
            throw new CustomError(ErrorMessage.PLAN_ALREADY_EXITS, HttpStatusCode.CONFLICT);
        }
        const dataPlan = {
            ...data,
            name,
        };
        await this._subscriptionPlanRepository.create(dataPlan);
    }
    async getSubscriptionPlan(search) {
        const filter = {};
        if (search) {
            filter.$or = [{ name: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }];
        }
        const plans = await this._subscriptionPlanRepository.findAll(filter);
        if (!plans || plans.length <= 0) {
            return [];
        }
        return toAdminSubscriptionPlanList(plans);
    }
    async updateSubscriptionPlan(data) {
        const name = data.name.charAt(0).toUpperCase() + data.name.slice(1).toLowerCase();
        const plan = await this._subscriptionPlanRepository.findOne({
            _id: { $ne: data.id },
        });
        if (plan && plan.name === name) {
            throw new CustomError(ErrorMessage.PLAN_ALREADY_EXITS, HttpStatusCode.CONFLICT);
        }
        const dataPlan = {
            ...data,
            name,
        };
        await this._subscriptionPlanRepository.update(dataPlan.id, dataPlan);
    }
    async deleteSubscriptionPlan(id) {
        const plan = await this._subscriptionPlanRepository.findById(id);
        if (!plan) {
            throw new CustomError(ErrorMessage.PLAN_NOT_FOUND, HttpStatusCode.NOT_FOUND);
        }
        await this._subscriptionPlanRepository.delete(id);
    }
    async scheduleDowngrade(userId, newPlanId) {
        const providerId = await this._providerRepository.getProviderId(userId);
        const [provider, newPlan] = await Promise.all([
            this._providerRepository.findById(providerId),
            this._subscriptionPlanRepository.findById(newPlanId),
        ]);
        if (!provider)
            throw new CustomError(ErrorMessage.PROVIDER_NOT_FOUND, HttpStatusCode.NOT_FOUND);
        if (!newPlan)
            throw new CustomError(ErrorMessage.PLAN_NOT_FOUND, HttpStatusCode.NOT_FOUND);
        if (!provider.subscription || provider.subscription.status !== SubscriptionStatus.ACTIVE) {
            throw new CustomError("No active subscription to downgrade.", HttpStatusCode.BAD_REQUEST);
        }
        const currentPlan = await this._subscriptionPlanRepository.findById(provider.subscription.planId.toString());
        if (!currentPlan)
            throw new CustomError("Current plan not found.", HttpStatusCode.INTERNAL_SERVER_ERROR);
        if (newPlan.price >= currentPlan.price) {
            throw new CustomError("This is not a downgrade. Please use the Upgrade or Subscribe flow.", HttpStatusCode.BAD_REQUEST);
        }
        provider.subscription.pendingDowngradePlanId = new Types.ObjectId(newPlanId);
        const updatedProvider = await provider.save();
        return updatedProvider.subscription;
    }
    async cancelDowngrade(userId) {
        const providerId = await this._providerRepository.getProviderId(userId);
        const provider = await this._providerRepository.findById(providerId);
        if (!provider)
            throw new CustomError(ErrorMessage.PROVIDER_NOT_FOUND, HttpStatusCode.NOT_FOUND);
        if (!provider.subscription) {
            throw new CustomError("No subscription found.", HttpStatusCode.BAD_REQUEST);
        }
        if (!provider.subscription.pendingDowngradePlanId) {
            throw new CustomError("No pending downgrade to cancel.", HttpStatusCode.BAD_REQUEST);
        }
        provider.subscription.pendingDowngradePlanId = undefined;
        const updatedProvider = await provider.save();
        return updatedProvider.subscription;
    }
    async checkAndExpire(providerId) {
        const provider = await this._providerRepository.findById(providerId);
        if (!provider)
            throw new CustomError(ErrorMessage.PROVIDER_NOT_FOUND, HttpStatusCode.NOT_FOUND);
        const subscription = provider.subscription;
        if (!subscription) {
            return { status: SubscriptionStatus.NONE };
        }
        if (subscription.status === SubscriptionStatus.ACTIVE &&
            subscription.endDate &&
            new Date(subscription.endDate) < new Date()) {
            if (subscription.pendingDowngradePlanId) {
                const newPlan = await this._subscriptionPlanRepository.findById(subscription.pendingDowngradePlanId.toString());
                if (newPlan) {
                    const newStartDate = new Date();
                    const newEndDate = new Date(newStartDate);
                    newEndDate.setDate(newEndDate.getDate() + newPlan.durationInDays);
                    subscription.planId = newPlan._id;
                    subscription.startDate = newStartDate;
                    subscription.endDate = newEndDate;
                    subscription.status = SubscriptionStatus.ACTIVE;
                    subscription.pendingDowngradePlanId = undefined;
                    await provider.save();
                    return provider.subscription;
                }
            }
            subscription.status = SubscriptionStatus.EXPIRED;
            subscription.pendingDowngradePlanId = undefined;
            await provider.save();
        }
        return provider.subscription;
    }
    async createSubscriptionOrder(providerId, planId) {
        const plan = await this._subscriptionPlanRepository.findById(planId);
        if (!plan)
            throw new CustomError(ErrorMessage.PLAN_NOT_FOUND, HttpStatusCode.NOT_FOUND);
        const order = await paymentCreation(plan.price);
        return {
            order: { ...order, entity: "order" },
            plan,
        };
    }
    async calculateUpgradeCost(userId, newPlanId) {
        const providerId = await this._providerRepository.getProviderId(userId);
        const [provider, newPlan] = await Promise.all([
            this._providerRepository.findById(providerId),
            this._subscriptionPlanRepository.findById(newPlanId),
        ]);
        if (!provider)
            throw new CustomError(ErrorMessage.PROVIDER_NOT_FOUND, HttpStatusCode.NOT_FOUND);
        if (!newPlan)
            throw new CustomError(ErrorMessage.PLAN_NOT_FOUND, HttpStatusCode.NOT_FOUND);
        const sub = provider.subscription;
        if (!sub || !sub.planId || !sub.endDate || sub.status !== SubscriptionStatus.ACTIVE) {
            throw new CustomError("No active subscription found. Please use the standard subscribe method.", HttpStatusCode.BAD_REQUEST);
        }
        const currentPlan = await this._subscriptionPlanRepository.findById(sub.planId.toString());
        if (!currentPlan)
            throw new CustomError("Current plan not found.", HttpStatusCode.INTERNAL_SERVER_ERROR);
        if (newPlan.price <= currentPlan.price) {
            throw new CustomError("This is a downgrade or same plan. Downgrades will be supported in a future update.", HttpStatusCode.BAD_REQUEST);
        }
        const today = new Date();
        const endDate = new Date(sub.endDate);
        if (today >= endDate) {
            throw new CustomError("Your plan is expired. Please create a new subscription.", HttpStatusCode.BAD_REQUEST);
        }
        const msInDay = 1000 * 60 * 60 * 24;
        const daysRemaining = Math.max(0, (endDate.getTime() - today.getTime()) / msInDay);
        const perDayCost = currentPlan.price / currentPlan.durationInDays;
        const remainingValue = perDayCost * daysRemaining;
        const costToPay = Math.max(1, newPlan.price - remainingValue);
        const finalAmountInRupees = Math.round(costToPay);
        const order = await paymentCreation(finalAmountInRupees);
        return {
            order: { ...order, entity: "order" },
            newPlan: newPlan,
            oldPlanValue: Math.round(remainingValue),
            newPlanPrice: newPlan.price,
            finalAmount: finalAmountInRupees,
        };
    }
    async verifySubscriptionPayment(providerId, planId, razorpay_order_id, razorpay_payment_id, razorpay_signature) {
        const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        if (!isValid) {
            throw new CustomError("invalid signature", HttpStatusCode.BAD_REQUEST);
        }
        const plan = await this._subscriptionPlanRepository.findById(planId);
        if (!plan)
            throw new CustomError(ErrorMessage.PLAN_NOT_FOUND, HttpStatusCode.NOT_FOUND);
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + plan.durationInDays);
        const provider = await this._providerRepository.update(providerId, {
            subscription: {
                status: "ACTIVE",
                planId,
                startDate,
                endDate,
            },
        });
        return {
            message: "Payment verified, subscription activated",
            provider: toProviderDTO(provider),
        };
    }
};
SubscriptionPlanService = __decorate([
    injectable(),
    __param(0, inject(TYPES.SubscriptionPlanRepository)),
    __param(1, inject(TYPES.ProviderRepository)),
    __metadata("design:paramtypes", [Object, Object])
], SubscriptionPlanService);
export { SubscriptionPlanService };
