import { CommissionTypes } from "../../enums/CommissionType.enum.js";
import { type ICommissionRule } from "../../models/Commission.js";
import { type ISubscriptionPlan } from "../../models/subscription.js";

export function applySubscriptionAdjustments(
  amount: number,
  totalCommission: number,
  plan: ISubscriptionPlan | null,
  commissionRule: ICommissionRule | null,
): number {
  if (!plan) return totalCommission;

  for (const feature of plan.features) {
    const text = feature.toLowerCase();

    if (text.includes("no commission")) {
      return 0;
    }

    if (text.includes("reduc") && text.includes("commission")) {
      const match = text.match(/-?\d+(\.\d+)?\s*(%|percent)?/);
      if (match) {
        const reductionPercent = parseFloat(match[0].replace(/[^0-9.-]/g, ""));
        const normalPercent =
          commissionRule?.commissionType === CommissionTypes.PERCENTAGE ? commissionRule.commissionValue || 0 : 0;

        if (reductionPercent >= normalPercent) return 0;

        totalCommission -= (amount * reductionPercent) / 100;
        if (totalCommission < 0) return 0;
      }
    }
  }

  return totalCommission;
}
