import { CommissionTypes } from "../../enums/CommissionType.enum";
import { type ICategory } from "../../models/Categories";
import { type ICommissionRule } from "../../models/Commission";
import { type ICategoryRepository } from "../../repositories/interface/ICategoryRepository";
import { type ICommissionRuleRepository } from "../../repositories/interface/ICommissonRuleRepository";

export async function calculateCommission(amount: number, commissionRule: ICommissionRule | null): Promise<number> {
  if (!commissionRule || commissionRule.commissionType === CommissionTypes.NONE) return 0;

  if (commissionRule.commissionType === CommissionTypes.PERCENTAGE) {
    return (amount * (commissionRule.commissionValue || 0)) / 100;
  }
  return commissionRule.commissionValue || 0;
}

export async function calculateParentCommission(
  amount: number,
  subCategory: ICategory,
  categoryRepo: ICategoryRepository,
  commissionRepo: ICommissionRuleRepository,
): Promise<number> {
  if (!subCategory.parentId) return 0;

  const parentCategory = await categoryRepo.findById(subCategory.parentId.toString());
  if (!parentCategory) return 0;

  const parentCommission = await commissionRepo.findOne({
    categoryId: parentCategory._id.toString(),
  });
  return calculateCommission(amount, parentCommission);
}
