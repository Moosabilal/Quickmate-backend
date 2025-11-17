"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applySubscriptionAdjustments = applySubscriptionAdjustments;
const CommissionType_enum_1 = require("../../enums/CommissionType.enum");
function applySubscriptionAdjustments(amount, totalCommission, plan, commissionRule) {
    if (!plan)
        return totalCommission;
    for (const feature of plan.features) {
        const text = feature.toLowerCase();
        if (text.includes("no commission")) {
            return 0;
        }
        if (text.includes("reduc") && text.includes("commission")) {
            const match = text.match(/-?\d+(\.\d+)?\s*(%|percent)?/);
            if (match) {
                const reductionPercent = parseFloat(match[0].replace(/[^0-9.-]/g, ""));
                const normalPercent = (commissionRule === null || commissionRule === void 0 ? void 0 : commissionRule.commissionType) === CommissionType_enum_1.CommissionTypes.PERCENTAGE
                    ? commissionRule.commissionValue || 0
                    : 0;
                if (reductionPercent >= normalPercent)
                    return 0;
                totalCommission -= (amount * reductionPercent) / 100;
                if (totalCommission < 0)
                    return 0;
            }
        }
    }
    return totalCommission;
}
