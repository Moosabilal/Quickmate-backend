import { Types, Document } from 'mongoose';
import { CommissionTypes } from '../enums/CommissionType.enum';
export interface ICategoryInput {
    name: string;
    description?: string | null;
    parentId?: string | Types.ObjectId | null; 
    status?: boolean;
    iconUrl?: string | null; 
}
export interface ICategoryResponse extends Omit<ICategoryInput, 'parentId'> {
    _id: string; 
    parentId?: string | null; 
    createdAt: string; 
    updatedAt: string; 
    subCategoryCount?: number;
    subCategories?: Array<ICategoryResponse>; 
    commissionRule?: ICommissionRuleResponse | null;
}
export interface ICommissionRuleInput {
    categoryId?: string | null; 
    commissionType?: CommissionTypes;
    commissionValue?: number;
    status?: boolean;
}
export interface ICommissionRule extends Document {
    _id: Types.ObjectId;
    categoryId?: Types.ObjectId | null; 
    commissionType: CommissionTypes;
    status: boolean; 
    createdAt: Date;
    updatedAt: Date;
}
export interface ICommissionRuleResponse extends Omit<ICommissionRuleInput, 'categoryId'> {
    _id: string; 
    categoryId?: string | null; 
    createdAt: string;
    updatedAt: string;
}
export interface ICategoryFormCombinedData {
    id?: string;
    name: string;
    description: string;
    iconUrl?: string | null; 
    status: boolean; 
    parentId?: string | null; 

    commissionType: CommissionTypes; 
    commissionValue: number | ''; 
    commissionStatus: boolean; 
}
export interface ISubcategoryFormFetchData {
    _id: string;
    name: string;
    description: string;
    iconUrl?: string | null;
    status: boolean;
    parentId?: string | null;
}

export interface IserviceResponse {
    id: string;
    name: string;
    description?: string;
    iconUrl?: string | null;
    parentId?: string | null
}