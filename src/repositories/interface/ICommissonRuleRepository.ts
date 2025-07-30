import { Types } from 'mongoose';
import { ICommissionRule } from '../../models/Commission';
import { ICommissionRuleInput } from '../../dto/category.dto';


export interface ICommissionRuleRepository {
    create(ruleData: ICommissionRuleInput): Promise<ICommissionRule>
    findById(id: string | Types.ObjectId): Promise<ICommissionRule | null>
    findByCategoryId(categoryId: string | Types.ObjectId): Promise<ICommissionRule | null>
    findAll(filter: any): Promise<ICommissionRule[]>
    update(id: string | Types.ObjectId, updateData: Partial<ICommissionRuleInput>): Promise<ICommissionRule | null>
    delete(id: string | Types.ObjectId): Promise<ICommissionRule | null>

}