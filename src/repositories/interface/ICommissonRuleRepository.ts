import { Types } from 'mongoose';
import { ICommissionRule } from '../../models/Commission';
import { ICommissionRuleInput } from '../../interface/category';
import { IBaseRepository } from './base/IBaseRepository';


export interface ICommissionRuleRepository extends IBaseRepository<ICommissionRule> {
    getAllCommissions(): Promise<ICommissionRule[]>
    delete(id: string | Types.ObjectId): Promise<ICommissionRule | null>
    updateStatusForCategoryIds(categoryIds: Types.ObjectId[], status: boolean): Promise<void>;
    createOrUpdate(categoryId: string, ruleInput: ICommissionRuleInput): Promise<ICommissionRule>

}