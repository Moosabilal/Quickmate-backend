import { type Types } from "mongoose";
import { type ICategory } from "../../models/Categories.js";
import { type ICategoryAndCommission, type ICategoryInput } from "../../interface/category.js";
import { type IBaseRepository } from "./base/IBaseRepository.js";
import { type FilterQuery } from "mongoose";

export interface ICategoryRepository extends IBaseRepository<ICategory> {
  findByName(name: string): Promise<ICategory | null>;
  findSubCatByName(name: string): Promise<ICategory | null>;
  findByNameAndParent(name: string, parentId: string | Types.ObjectId): Promise<ICategory | null>;
  findAll(filter: FilterQuery<ICategory>): Promise<ICategory[]>;
  getAllCategories(): Promise<ICategory[]>;
  update(id: string | Types.ObjectId, updateData: Partial<ICategoryInput>): Promise<ICategory | null>;
  countSubcategories(parentId: string | Types.ObjectId): Promise<number>;
  updateSubcategoriesStatus(parentId: string | Types.ObjectId, status: boolean): Promise<void>;
  findAllSubCategories(search: string, skip: number, limit: number): Promise<ICategory[]>;
  countOfSubCategories(search: string): Promise<number>;
  findByIds(ids: string[]): Promise<ICategory[]>;
  findSubcategoryIds(parentId: string): Promise<Types.ObjectId[]>;
  updateStatusForIds(ids: Types.ObjectId[], status: boolean): Promise<void>;
  findCategoriesWithDetails(options: {
    filter: FilterQuery<ICategory>;
    page: number;
    limit: number;
  }): Promise<{ categories: ICategoryAndCommission[]; total: number }>;
  findActiveSubCategories(sort: number, skip: number, limit: number): Promise<ICategory[]>;

  findSubCategoryByName(name: string): Promise<ICategory | null>;
  findParentCategoryByName(name: string): Promise<ICategory | null>;
  findAllActiveSubCategories(): Promise<ICategory[]>;
  findRelatedCategories(parentId: string, currentId: string, limit: number): Promise<ICategory[]>;
}
