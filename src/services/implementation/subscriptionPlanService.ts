import { inject, injectable } from "inversify";
import { ISubscriptionPlanService } from "../interface/ISubscriptionPlanService";
import { ISubscriptionPlanRepository } from "../../repositories/interface/ISubscriptionPlanRepository";
import TYPES from "../../di/type";
import { ISubscriptionPlan } from "../../models/subscription";
import { CustomError } from "../../utils/CustomError";
import { ErrorMessage } from "../../enums/ErrorMessage";
import { HttpStatusCode } from "../../enums/HttpStatusCode";
import { toAdminSubscriptionPlanList } from "../../utils/mappers/subscription.mapper";
import { AdminSubscriptionPlanDTO } from "../../interface/subscriptionPlan";
import { IProviderRepository } from "../../repositories/interface/IProviderRepository";
import { SubscriptionStatus } from "../../enums/subscription.enum";
import { IProviderProfile, ISubscription } from "../../interface/provider.dto";
import { paymentCreation, verifyPaymentSignature } from "../../utils/razorpay";
import { RazorpayOrder } from "../../interface/razorpay.dto";
import { toProviderDTO } from "../../utils/mappers/provider.mapper";

@injectable()
export class SubscriptionPlanService implements ISubscriptionPlanService {
    private _subscriptionPlanRepository: ISubscriptionPlanRepository;
    private _providerRepository: IProviderRepository;
    constructor(@inject(TYPES.SubscriptionPlanRepository) subscriptionPlanRepository: ISubscriptionPlanRepository,
        @inject(TYPES.ProviderRepository) providerRepository: IProviderRepository
    ) {
        this._subscriptionPlanRepository = subscriptionPlanRepository;
        this._providerRepository = providerRepository;
    }

    public async createSubscriptionPlan(data: AdminSubscriptionPlanDTO): Promise<void> {
        const name = data.name.charAt(0).toUpperCase() + data.name.slice(1).toLowerCase();
        const plan = await this._subscriptionPlanRepository.findOne({ name })
        if (plan) {
            throw new CustomError(ErrorMessage.PLAN_ALREADY_EXITS, HttpStatusCode.CONFLICT)
        }
        const dataPlan: AdminSubscriptionPlanDTO = {
            ...data,
            name
        }
        await this._subscriptionPlanRepository.create(dataPlan)
    }

    public async getSubscriptionPlan(): Promise<AdminSubscriptionPlanDTO[]> {
        const plans = await this._subscriptionPlanRepository.findAll()
        console.log('the palns', plans)
        if (!plans || plans.length <= 0) {
            return []
        }
        return toAdminSubscriptionPlanList(plans)
    }

    public async updateSubscriptionPlan(data: AdminSubscriptionPlanDTO): Promise<void> {
        const name = data.name.charAt(0).toUpperCase() + data.name.slice(1).toLowerCase();
        const plan = await this._subscriptionPlanRepository.findOne({ _id: { $ne: data.id } })
        if (plan && plan.name === name) {
            throw new CustomError(ErrorMessage.PLAN_ALREADY_EXITS, HttpStatusCode.CONFLICT)
        }
        const dataPlan: AdminSubscriptionPlanDTO = {
            ...data,
            name
        }
        await this._subscriptionPlanRepository.update(dataPlan.id, dataPlan)
    }

    public async deleteSubscriptionPlan(id: string): Promise<void> {
        const plan = await this._subscriptionPlanRepository.findById(id)
        if (!plan) {
            throw new CustomError(ErrorMessage.PLAN_NOT_FOUND, HttpStatusCode.NOT_FOUND)
        }
        await this._subscriptionPlanRepository.delete(id)
    }


    public async checkAndExpire(providerId: string): Promise<ISubscription> {
        const provider = await this._providerRepository.findById(providerId);
        if (!provider) throw new CustomError(ErrorMessage.PROVIDER_NOT_FOUND, HttpStatusCode.NOT_FOUND)

        const subscription = provider.subscription;
        if (
            subscription?.status === SubscriptionStatus.ACTIVE &&
            subscription?.endDate &&
            new Date(subscription.endDate) < new Date()
        ) {
            subscription.status = SubscriptionStatus.EXPIRED;
            await provider.save();
        }

        return provider.subscription;
    }

    public async createSubscriptionOrder(providerId: string, planId: string): Promise<{ order: RazorpayOrder, plan: ISubscriptionPlan}> {

        const plan = await this._subscriptionPlanRepository.findById(planId);
        if (!plan) throw new CustomError(ErrorMessage.PLAN_NOT_FOUND, HttpStatusCode.NOT_FOUND)

        const order = await paymentCreation(plan.price);

        return {
            order: {...order, entity: "order"} as RazorpayOrder,
            plan
        }
    };

    public async verifySubscriptionPayment(
        providerId: string,
        planId: string,
        razorpay_order_id: string,
        razorpay_payment_id: string,
        razorpay_signature: string): Promise<{message: string, provider: IProviderProfile}> {

        const isValid = verifyPaymentSignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isValid) {
            throw new CustomError("invalid signature", HttpStatusCode.BAD_REQUEST)
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
            provider: toProviderDTO(provider) 
        }
    };


}