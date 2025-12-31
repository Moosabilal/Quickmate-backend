"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toAdminSubscriptionPlanList = void 0;
const toAdminSubscriptionPlanList = (plans) => __awaiter(void 0, void 0, void 0, function* () {
    return plans.map((plan) => (Object.assign(Object.assign({}, plan.toObject()), { id: plan._id.toString() })));
});
exports.toAdminSubscriptionPlanList = toAdminSubscriptionPlanList;
