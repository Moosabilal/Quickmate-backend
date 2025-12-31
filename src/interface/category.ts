import { Types, Document } from 'mongoose';
import { CommissionTypes } from '../enums/CommissionType.enum';
import { FilterQuery } from 'mongoose';
import { ICategory } from '../models/Categories';
export interface ICategoryInput {
    name: string;
    description?: string | null;
    parentId?: string | null; 
    status?: boolean;
    iconUrl?: string | null; 
}

export interface ICategoryAndCommission extends ICategoryInput {
    _id: Types.ObjectId;
    subCategoryCount: number;
    commissionRule: Omit<ICommissionRuleInput, 'categoryId'>;
}
export interface ICategoryResponse extends Omit<ICategoryInput, 'parentId'> {
    id: string; 
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

export interface IserviceResponse {
    id: string;
    name: string;
    description?: string;
    iconUrl?: string | null;
    parentId?: string | null
}

export interface ICommissionSummary {
    totalCommissionRevenue: number;
    totalCommissionRevenueChange: number;
    averageCommissionPerBooking: number;
    averageCommissionPerBookingChange: number;
    totalBookings: number;
    totalBookingsChange: number;
    commissionDeductionsToProviders: number;
    commissionDeductionsToProvidersChange: number;
}

export interface ICategoryFilter extends FilterQuery<ICategory> {
    take?: number | string;
    skip?: number | string;
}

export interface ICategoryWithDetails extends ICategoryFormCombinedData {
    subCategoriesCount: number;
}

export interface ICategoryDto extends Partial<ICategory> {
    iconUrl: string | null;
}