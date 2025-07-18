import { Types } from "mongoose";
import { ICategory } from "../../models/Categories";
import { ICategoryInput } from "../../types/category";


export interface ICategoryRepository {
    create(categoryData: ICategoryInput): Promise<ICategory>
    findById(id: string | Types.ObjectId): Promise<ICategory | null>
    findByName(name: string): Promise<ICategory | null>
    findByNameAndParent(name: string, parentId: string | Types.ObjectId): Promise<ICategory | null>
    findAll(filter: any): Promise<ICategory[]>
    findAllSubcategories(p0: {}): Promise<ICategory[]>
    update(id: string | Types.ObjectId, updateData: Partial<ICategoryInput>): Promise<ICategory | null>
    delete(id: string | Types.ObjectId): Promise<ICategory | null>
    countSubcategories(parentId: string | Types.ObjectId): Promise<number>
    updateSubcategoriesStatus(parentId: string | Types.ObjectId, status: boolean): Promise<void>

}   