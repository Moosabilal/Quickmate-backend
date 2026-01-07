import { type Types } from "mongoose";
import { type ICommissionRule } from "../../models/Commission";
import { type ICommissionRuleInput } from "../../interface/category";
import { type IBaseRepository } from "./base/IBaseRepository";

export interface ICommissionRuleRepository extends IBaseRepository<ICommissionRule> {
  getAllCommissions(): Promise<ICommissionRule[]>;
  delete(id: string | Types.ObjectId): Promise<ICommissionRule | null>;
  updateStatusForCategoryIds(categoryIds: Types.ObjectId[], status: boolean): Promise<void>;
  createOrUpdate(categoryId: string, ruleInput: ICommissionRuleInput): Promise<ICommissionRule>;
}
