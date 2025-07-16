import { Types, Document } from 'mongoose';
export interface ICategoryInput {
    name: string;
    description?: string | null;
    parentId?: string | Types.ObjectId | null; 
    status?: boolean;
    iconUrl?: string | null; 
}
// export interface ICategory extends Document {
//     _id: Types.ObjectId;
//     name: string;
//     description?: string | null;
//     parentId?: Types.ObjectId | null;
//     status: boolean;
//     iconUrl?: string | null;
//     createdAt: Date;
//     updatedAt: Date;
// }
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
    globalCommission?: number | null | undefined ; 
    flatFee?: number; 
    categoryCommission?: number; 
    status?: boolean;
}
export interface ICommissionRule extends Document {
    _id: Types.ObjectId;
    categoryId?: Types.ObjectId | null; 
    globalCommission?: number;
    flatFee?: number;
    categoryCommission?: number;
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
    _id?: string;
    name: string;
    description: string;
    iconUrl?: string | null; 
    status: boolean; 
    parentId?: string | null; 

    commissionType: 'percentage' | 'flatFee' | 'none'; 
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