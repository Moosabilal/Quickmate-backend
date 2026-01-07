import { CommissionRule, type ICommissionRule } from "../../models/Commission";
import { type ICommissionRuleInput } from "../../interface/category";
import { Types } from "mongoose";
import { type ICommissionRuleRepository } from "../interface/ICommissonRuleRepository";
import { injectable } from "inversify";
import { BaseRepository } from "./base/BaseRepository";

@injectable()
export class CommissionRuleRepository extends BaseRepository<ICommissionRule> implements ICommissionRuleRepository {
  constructor() {
    super(CommissionRule);
  }

  async getAllCommissions(): Promise<ICommissionRule[]> {
    return CommissionRule.find();
  }

  async delete(id: string | Types.ObjectId): Promise<ICommissionRule | null> {
    return CommissionRule.findByIdAndDelete(id).exec();
  }

  async updateStatusForCategoryIds(categoryIds: Types.ObjectId[], status: boolean): Promise<void> {
    await this.model.updateMany({ categoryId: { $in: categoryIds } }, { $set: { status } });
  }

  async createOrUpdate(categoryId: string, ruleInput: ICommissionRuleInput): Promise<ICommissionRule> {
    const existingRule = await this.findOne({
      categoryId: new Types.ObjectId(categoryId),
    });

    const ruleData = {
      categoryId: new Types.ObjectId(categoryId),
      commissionType: ruleInput.commissionType,
      commissionValue: ruleInput.commissionValue,
      status: ruleInput.status ?? true,
    };

    if (existingRule) {
      return this.update(existingRule._id.toString(), ruleData);
    } else {
      return this.create(ruleData);
    }
  }
}
