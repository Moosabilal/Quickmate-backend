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

@injectable()
export class SubscriptionPlanService implements ISubscriptionPlanService {
    private _subscriptionPlanRepository: ISubscriptionPlanRepository;
    constructor(@inject(TYPES.SubscriptionPlanRepository) subscriptionPlanRepository: ISubscriptionPlanRepository) {
        this._subscriptionPlanRepository = subscriptionPlanRepository
    }

    public async createSubscriptionPlan(data: AdminSubscriptionPlanDTO): Promise<void> {
        const name = data.name.charAt(0).toUpperCase() + data.name.slice(1).toLowerCase();
        const plan = await this._subscriptionPlanRepository.findOne({name})
        if(plan){
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
        if(!plans || plans.length <= 0){
            return []
        }
        return toAdminSubscriptionPlanList(plans)
    }

    public async updateSubscriptionPlan(data: AdminSubscriptionPlanDTO): Promise<void> {
        const name = data.name.charAt(0).toUpperCase() + data.name.slice(1).toLowerCase();
        const plan = await this._subscriptionPlanRepository.findOne({ _id: { $ne: data.id } })
        if(plan && plan.name === name){
            throw new CustomError(ErrorMessage.PLAN_ALREADY_EXITS, HttpStatusCode.CONFLICT)
        }
        const dataPlan: AdminSubscriptionPlanDTO = {
            ...data,
            name
        }
        await this._subscriptionPlanRepository.update(dataPlan.id, dataPlan)
    }

    public async deleteSubscriptionPlan(id: string): Promise<void> {
        console.log('the id', id)
        const plan = await this._subscriptionPlanRepository.findById(id)
        console.log('the plane exists', plan._id)
        await this._subscriptionPlanRepository.delete(id)
    }


}