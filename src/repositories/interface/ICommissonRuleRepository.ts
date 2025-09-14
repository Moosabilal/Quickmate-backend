import { Types } from 'mongoose';
import { ICommissionRule } from '../../models/Commission';
import { ICommissionRuleInput } from '../../interface/category.dto';
import { IBaseRepository } from './base/IBaseRepository';


export interface ICommissionRuleRepository extends IBaseRepository<ICommissionRule> {
    getAllCommissions(): Promise<ICommissionRule[]>
    findAll(filter: any): Promise<ICommissionRule[]>
    update(id: string | Types.ObjectId, updateData: Partial<ICommissionRuleInput>): Promise<ICommissionRule | null>
    delete(id: string | Types.ObjectId): Promise<ICommissionRule | null>

}