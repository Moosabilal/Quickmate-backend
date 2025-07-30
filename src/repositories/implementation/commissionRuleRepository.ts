import { CommissionRule, ICommissionRule } from '../../models/Commission';
import { ICommissionRuleInput } from '../../dto/category.dto'; 
import { Types } from 'mongoose';
import { ICommissionRuleRepository } from '../interface/ICommissonRuleRepository';

export class CommissionRuleRepository implements ICommissionRuleRepository {

  async create(ruleData: ICommissionRuleInput): Promise<ICommissionRule> {
    const rule = new CommissionRule(ruleData);
    await rule.save();
    return rule;
  }

 
  async findById(id: string | Types.ObjectId): Promise<ICommissionRule | null> {
    return CommissionRule.findById(id).exec();
  }

 
  async findByCategoryId(categoryId: string | Types.ObjectId): Promise<ICommissionRule | null> {
    return CommissionRule.findOne({ categoryId: new Types.ObjectId(categoryId) }).exec();
  }



  async findAll(filter: any): Promise<ICommissionRule[]> {
    return CommissionRule.find(filter).exec();
  }


  async update(id: string | Types.ObjectId, updateData: Partial<ICommissionRuleInput>): Promise<ICommissionRule | null> {
    return CommissionRule.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }


  async delete(id: string | Types.ObjectId): Promise<ICommissionRule | null> {
    return CommissionRule.findByIdAndDelete(id).exec();
  }
}