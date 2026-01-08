import Subscription from "../../models/subscription";
import { BaseRepository } from "./base/BaseRepository";
export class SubscriptionPlanRepository extends BaseRepository {
    constructor() {
        super(Subscription);
    }
}
