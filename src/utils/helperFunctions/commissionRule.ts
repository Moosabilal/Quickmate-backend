import { CommissionTypes } from "../../enums/CommissionType.enum";
import { ICategory } from "../../models/Categories";
import { ICommissionRule } from "../../models/Commission";

export async function calculateCommission(
    amount: number,
    commissionRule: ICommissionRule | null
): Promise<number> {
    if (!commissionRule || commissionRule.commissionType === CommissionTypes.NONE) return 0;

    if (commissionRule.commissionType === CommissionTypes.PERCENTAGE) {
        return (amount * (commissionRule.commissionValue || 0)) / 100;
    }
    return commissionRule.commissionValue || 0;
}

export async function calculateParentCommission(
    amount: number,
    subCategory: ICategory,
    categoryRepo: any,
    commissionRepo: any
): Promise<number> {
    if (!subCategory.parentId) return 0;

    const parentCategory = await categoryRepo.findById(subCategory.parentId.toString());
    if (!parentCategory) return 0;

    const parentCommission = await commissionRepo.findOne({ categoryId: parentCategory._id.toString() });
    return calculateCommission(amount, parentCommission);
}