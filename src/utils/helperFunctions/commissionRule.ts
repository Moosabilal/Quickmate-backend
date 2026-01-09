import { CommissionTypes } from "../../enums/CommissionType.enum.js";
import { type ICommissionRule } from "../../models/Commission.js";

export async function calculateCommission(amount: number, commissionRule: ICommissionRule | null): Promise<number> {
  if (!commissionRule || commissionRule.commissionType === CommissionTypes.NONE) return 0;

  if (commissionRule.commissionType === CommissionTypes.PERCENTAGE) {
    return (amount * (commissionRule.commissionValue || 0)) / 100;
  }
  return commissionRule.commissionValue || 0;
}
