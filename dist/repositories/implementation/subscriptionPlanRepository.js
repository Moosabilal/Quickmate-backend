import Subscription, {} from "../../models/subscription.js";
import {} from "../interface/ISubscriptionPlanRepository.js";
import { BaseRepository } from "./base/BaseRepository.js";
export class SubscriptionPlanRepository extends BaseRepository {
    constructor() {
        super(Subscription);
    }
}
