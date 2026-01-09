import { CommissionTypes } from "../../enums/CommissionType.enum.js";
import {} from "../../models/Commission.js";
export async function calculateCommission(amount, commissionRule) {
    if (!commissionRule || commissionRule.commissionType === CommissionTypes.NONE)
        return 0;
    if (commissionRule.commissionType === CommissionTypes.PERCENTAGE) {
        return (amount * (commissionRule.commissionValue || 0)) / 100;
    }
    return commissionRule.commissionValue || 0;
}
