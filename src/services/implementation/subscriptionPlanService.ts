import { inject, injectable } from "inversify";
import { type ISubscriptionPlanService } from "../interface/ISubscriptionPlanService.js";
import { type ISubscriptionPlanRepository } from "../../repositories/interface/ISubscriptionPlanRepository.js";
import TYPES from "../../di/type.js";
import { type ISubscriptionPlan } from "../../models/subscription.js";
import { CustomError } from "../../utils/CustomError.js";
import { ErrorMessage } from "../../enums/ErrorMessage.js";
import { HttpStatusCode } from "../../enums/HttpStatusCode.js";
import { toAdminSubscriptionPlanList } from "../../utils/mappers/subscription.mapper.js";
import { type AdminSubscriptionPlanDTO, type IUpgradeCostResponse } from "../../interface/subscriptionPlan.js";
import { type IProviderRepository } from "../../repositories/interface/IProviderRepository.js";
import { SubscriptionStatus } from "../../enums/subscription.enum.js";
import { type IProviderProfile, type ISubscription } from "../../interface/provider.js";
import { paymentCreation, verifyPaymentSignature } from "../../utils/razorpay.js";
import { type RazorpayOrder } from "../../interface/razorpay.js";
import { toProviderDTO } from "../../utils/mappers/provider.mapper.js";
import { type FilterQuery, Types } from "mongoose";

@injectable()
export class SubscriptionPlanService implements ISubscriptionPlanService {
  private _subscriptionPlanRepository: ISubscriptionPlanRepository;
  private _providerRepository: IProviderRepository;
  constructor(
    @inject(TYPES.SubscriptionPlanRepository)
    subscriptionPlanRepository: ISubscriptionPlanRepository,
    @inject(TYPES.ProviderRepository) providerRepository: IProviderRepository,
  ) {
    this._subscriptionPlanRepository = subscriptionPlanRepository;
    this._providerRepository = providerRepository;
  }

  public async createSubscriptionPlan(data: AdminSubscriptionPlanDTO): Promise<void> {
    const name = data.name.charAt(0).toUpperCase() + data.name.slice(1).toLowerCase();
    const plan = await this._subscriptionPlanRepository.findOne({ name });
    if (plan) {
      throw new CustomError(ErrorMessage.PLAN_ALREADY_EXITS, HttpStatusCode.CONFLICT);
    }
    const dataPlan: AdminSubscriptionPlanDTO = {
      ...data,
      name,
    };
    await this._subscriptionPlanRepository.create(dataPlan);
  }

  public async getSubscriptionPlan(search?: string): Promise<AdminSubscriptionPlanDTO[]> {
    const filter: FilterQuery<ISubscriptionPlan> = {};
    if (search) {
      filter.$or = [{ name: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }];
    }
    const plans = await this._subscriptionPlanRepository.findAll(filter);
    if (!plans || plans.length <= 0) {
      return [];
    }
    return toAdminSubscriptionPlanList(plans);
  }

  public async updateSubscriptionPlan(data: AdminSubscriptionPlanDTO): Promise<void> {
    const name = data.name.charAt(0).toUpperCase() + data.name.slice(1).toLowerCase();
    const plan = await this._subscriptionPlanRepository.findOne({
      _id: { $ne: data.id },
    });
    if (plan && plan.name === name) {
      throw new CustomError(ErrorMessage.PLAN_ALREADY_EXITS, HttpStatusCode.CONFLICT);
    }
    const dataPlan: AdminSubscriptionPlanDTO = {
      ...data,
      name,
    };
    await this._subscriptionPlanRepository.update(dataPlan.id, dataPlan);
  }

  public async deleteSubscriptionPlan(id: string): Promise<void> {
    const plan = await this._subscriptionPlanRepository.findById(id);
    if (!plan) {
      throw new CustomError(ErrorMessage.PLAN_NOT_FOUND, HttpStatusCode.NOT_FOUND);
    }
    await this._subscriptionPlanRepository.delete(id);
  }

  public async scheduleDowngrade(userId: string, newPlanId: string): Promise<ISubscription> {
    const providerId = await this._providerRepository.getProviderId(userId);
    const [provider, newPlan] = await Promise.all([
      this._providerRepository.findById(providerId),
      this._subscriptionPlanRepository.findById(newPlanId),
    ]);

    if (!provider) throw new CustomError(ErrorMessage.PROVIDER_NOT_FOUND, HttpStatusCode.NOT_FOUND);
    if (!newPlan) throw new CustomError(ErrorMessage.PLAN_NOT_FOUND, HttpStatusCode.NOT_FOUND);
    if (!provider.subscription || provider.subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new CustomError("No active subscription to downgrade.", HttpStatusCode.BAD_REQUEST);
    }

    const currentPlan = await this._subscriptionPlanRepository.findById(provider.subscription.planId.toString());
    if (!currentPlan) throw new CustomError("Current plan not found.", HttpStatusCode.INTERNAL_SERVER_ERROR);

    if (newPlan.price >= currentPlan.price) {
      throw new CustomError(
        "This is not a downgrade. Please use the Upgrade or Subscribe flow.",
        HttpStatusCode.BAD_REQUEST,
      );
    }

    provider.subscription.pendingDowngradePlanId = new Types.ObjectId(newPlanId);

    const updatedProvider = await provider.save();
    return updatedProvider.subscription;
  }

  public async cancelDowngrade(userId: string): Promise<ISubscription> {
    const providerId = await this._providerRepository.getProviderId(userId);
    const provider = await this._providerRepository.findById(providerId);
    if (!provider) throw new CustomError(ErrorMessage.PROVIDER_NOT_FOUND, HttpStatusCode.NOT_FOUND);

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

  public async checkAndExpire(providerId: string): Promise<ISubscription> {
    const provider = await this._providerRepository.findById(providerId);
    if (!provider) throw new CustomError(ErrorMessage.PROVIDER_NOT_FOUND, HttpStatusCode.NOT_FOUND);

    const subscription = provider.subscription;
    if (!subscription) {
      return { status: SubscriptionStatus.NONE } as ISubscription;
    }

    if (
      subscription.status === SubscriptionStatus.ACTIVE &&
      subscription.endDate &&
      new Date(subscription.endDate) < new Date()
    ) {
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

  public async createSubscriptionOrder(
    providerId: string,
    planId: string,
  ): Promise<{ order: RazorpayOrder; plan: ISubscriptionPlan }> {
    const plan = await this._subscriptionPlanRepository.findById(planId);
    if (!plan) throw new CustomError(ErrorMessage.PLAN_NOT_FOUND, HttpStatusCode.NOT_FOUND);

    const order = await paymentCreation(plan.price);

    return {
      order: { ...order, entity: "order" } as RazorpayOrder,
      plan,
    };
  }

  public async calculateUpgradeCost(userId: string, newPlanId: string): Promise<IUpgradeCostResponse> {
    const providerId = await this._providerRepository.getProviderId(userId);
    const [provider, newPlan] = await Promise.all([
      this._providerRepository.findById(providerId),
      this._subscriptionPlanRepository.findById(newPlanId),
    ]);

    if (!provider) throw new CustomError(ErrorMessage.PROVIDER_NOT_FOUND, HttpStatusCode.NOT_FOUND);
    if (!newPlan) throw new CustomError(ErrorMessage.PLAN_NOT_FOUND, HttpStatusCode.NOT_FOUND);

    const sub = provider.subscription;

    if (!sub || !sub.planId || !sub.endDate || sub.status !== SubscriptionStatus.ACTIVE) {
      throw new CustomError(
        "No active subscription found. Please use the standard subscribe method.",
        HttpStatusCode.BAD_REQUEST,
      );
    }

    const currentPlan = await this._subscriptionPlanRepository.findById(sub.planId.toString());
    if (!currentPlan) throw new CustomError("Current plan not found.", HttpStatusCode.INTERNAL_SERVER_ERROR);

    if (newPlan.price <= currentPlan.price) {
      throw new CustomError(
        "This is a downgrade or same plan. Downgrades will be supported in a future update.",
        HttpStatusCode.BAD_REQUEST,
      );
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
      order: { ...order, entity: "order" } as RazorpayOrder,
      newPlan: newPlan,
      oldPlanValue: Math.round(remainingValue),
      newPlanPrice: newPlan.price,
      finalAmount: finalAmountInRupees,
    };
  }

  public async verifySubscriptionPayment(
    providerId: string,
    planId: string,
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string,
  ): Promise<{ message: string; provider: IProviderProfile }> {
    const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      throw new CustomError("invalid signature", HttpStatusCode.BAD_REQUEST);
    }

    const plan = await this._subscriptionPlanRepository.findById(planId);
    if (!plan) throw new CustomError(ErrorMessage.PLAN_NOT_FOUND, HttpStatusCode.NOT_FOUND);

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
}
