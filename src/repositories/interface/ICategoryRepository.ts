import { Types } from "mongoose";
import { ICategory } from "../../models/Categories";
import { ICategoryInput } from "../../interface/category";
import { IBaseRepository } from "./base/IBaseRepository";


export interface ICategoryRepository extends IBaseRepository<ICategory> {
    findByName(name: string): Promise<ICategory | null>
    findSubCatByName(name: string): Promise<ICategory | null>
    findByNameAndParent(name: string, parentId: string | Types.ObjectId): Promise<ICategory | null>
    findAll(filter: any): Promise<ICategory[]>
    findAllSubcategories(p0: {}): Promise<ICategory[]>
    getAllCategories(): Promise<ICategory[]>
    update(id: string | Types.ObjectId, updateData: Partial<ICategoryInput>): Promise<ICategory | null>
    countSubcategories(parentId: string | Types.ObjectId): Promise<number>
    updateSubcategoriesStatus(parentId: string | Types.ObjectId, status: boolean): Promise<void>
    findAllSubCategories(filter: any, skip: number, limit: number): Promise<ICategory[]>;
    countOfSubCategories(filter: any): Promise<number>;
    findByIds(ids: string[]): Promise<ICategory[]>;
    findSubcategoryIds(parentId: string): Promise<Types.ObjectId[]>;
    updateStatusForIds(ids: Types.ObjectId[], status: boolean): Promise<void>;

}   