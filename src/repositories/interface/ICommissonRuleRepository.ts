import { type Types } from "mongoose";
import { type ICommissionRule } from "../../models/Commission.js";
import { type ICommissionRuleInput } from "../../interface/category.js";
import { type IBaseRepository } from "./base/IBaseRepository.js";

export interface ICommissionRuleRepository extends IBaseRepository<ICommissionRule> {
  getAllCommissions(): Promise<ICommissionRule[]>;
  delete(id: string | Types.ObjectId): Promise<ICommissionRule | null>;
  updateStatusForCategoryIds(categoryIds: Types.ObjectId[], status: boolean): Promise<void>;
  createOrUpdate(categoryId: string, ruleInput: ICommissionRuleInput): Promise<ICommissionRule>;
}
