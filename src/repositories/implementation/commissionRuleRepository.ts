import { CommissionRule, ICommissionRule } from '../../models/Commission';
import { ICommissionRuleInput } from '../../dto/category.dto'; 
import { Types } from 'mongoose';
import { ICommissionRuleRepository } from '../interface/ICommissonRuleRepository';
import { injectable } from 'inversify';
import { BaseRepository } from './base/BaseRepository';

@injectable()
export class CommissionRuleRepository extends BaseRepository<ICommissionRule> implements ICommissionRuleRepository {

  constructor() {
    super(CommissionRule)
  }

  async getAllCommissions(): Promise<ICommissionRule[]> {
    return CommissionRule.find()
  }


  // async findAll(filter: any): Promise<ICommissionRule[]> {
  //   return CommissionRule.find(filter).exec();
  // }

  async delete(id: string | Types.ObjectId): Promise<ICommissionRule | null> {
    return CommissionRule.findByIdAndDelete(id).exec();
  }
}