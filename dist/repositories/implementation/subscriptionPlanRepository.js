"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionPlanRepository = void 0;
const subscription_1 = __importDefault(require("../../models/subscription"));
const BaseRepository_1 = require("./base/BaseRepository");
class SubscriptionPlanRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super(subscription_1.default);
    }
}
exports.SubscriptionPlanRepository = SubscriptionPlanRepository;
