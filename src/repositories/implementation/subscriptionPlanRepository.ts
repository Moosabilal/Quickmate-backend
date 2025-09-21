import Subscription, { ISubscriptionPlan } from "../../models/subscription";
import { ISubscriptionPlanRepository } from "../interface/ISubscriptionPlanRepository";
import { BaseRepository } from "./base/BaseRepository";


export class SubscriptionPlanRepository extends BaseRepository<ISubscriptionPlan> implements ISubscriptionPlanRepository {
    constructor() {
        super(Subscription)
    }
}