import { CommissionTypes } from "../../enums/CommissionType.enum";
export async function calculateCommission(amount, commissionRule) {
    if (!commissionRule || commissionRule.commissionType === CommissionTypes.NONE)
        return 0;
    if (commissionRule.commissionType === CommissionTypes.PERCENTAGE) {
        return (amount * (commissionRule.commissionValue || 0)) / 100;
    }
    return commissionRule.commissionValue || 0;
}
export async function calculateParentCommission(amount, subCategory, categoryRepo, commissionRepo) {
    if (!subCategory.parentId)
        return 0;
    const parentCategory = await categoryRepo.findById(subCategory.parentId.toString());
    if (!parentCategory)
        return 0;
    const parentCommission = await commissionRepo.findOne({
        categoryId: parentCategory._id.toString(),
    });
    return calculateCommission(amount, parentCommission);
}
