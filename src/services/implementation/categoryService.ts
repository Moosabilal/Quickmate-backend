import { CategoryRepository } from '../../repositories/implementation/categoryRepository';
import { CommissionRuleRepository } from '../../repositories/implementation/commissionRuleRepository';
import { ICategoryFormCombinedData, ICategoryInput, ICategoryResponse, ICommissionRuleInput, ICommissionRuleResponse } from '../../types/category';
import { ICategory } from '../../models/Categories';
import { Types } from 'mongoose';
import { inject, injectable } from 'inversify';
import { ICategoryRepository } from '../../repositories/interface/ICategoryRepository';
import TYPES from '../../di/type';
import { ICommissionRuleRepository } from '../../repositories/interface/ICommissonRuleRepository';
import { ICategoryService } from '../interface/ICategoryService';

export interface ServiceCommissionRuleInput {
    flatFee?: number;
    categoryCommission?: number;
    status?: boolean;
    removeRule?: boolean;
}

@injectable()
export class CategoryService implements ICategoryService {
    private categoryRepository: ICategoryRepository;
    private commissionRuleRepository: ICommissionRuleRepository;

    constructor(@inject(TYPES.CategoryRepository) categoryRepository: ICategoryRepository, @inject(TYPES.CommissionRuleRepository) commissionRuleRepository: ICommissionRuleRepository) {
        this.categoryRepository = categoryRepository
        this.commissionRuleRepository = commissionRuleRepository
    }


    async createCategory(
        categoryInput: ICategoryInput,
        commissionRuleInput?: ServiceCommissionRuleInput
    ): Promise<{ category: ICategoryResponse; commissionRule?: ICommissionRuleResponse }> {

        let parentObjectId: Types.ObjectId | null = null;
        if (categoryInput.parentId) {
            if (!Types.ObjectId.isValid(categoryInput.parentId)) {
                throw new Error('Invalid parent category ID.');
            }
            parentObjectId = new Types.ObjectId(categoryInput.parentId);
            const parentCategory = await this.categoryRepository.findById(parentObjectId);
            if (!parentCategory) {
                throw new Error('Parent category not found.');
            }

            const existingSubcategory = await this.categoryRepository.findByNameAndParent(categoryInput.name, parentObjectId);
            if (existingSubcategory) {
                throw new Error('A subcategory with this name already exists under the specified parent.');
            }
        } else {
            const existingTopLevelCategory = await this.categoryRepository.findByName(categoryInput.name);
            if (existingTopLevelCategory) {
                throw new Error('A top-level category with this name already exists.');
            }
        }

        const categoryDataToCreate: ICategoryInput = {
            ...categoryInput,
            parentId: parentObjectId ? parentObjectId.toString() : null,
            status: categoryInput.status ?? true,
        };


        const createdCategoryDoc = await this.categoryRepository.create(categoryDataToCreate);

        const categoryResponse: ICategoryResponse = createdCategoryDoc.toJSON() as unknown as ICategoryResponse;

        let createdCommissionRule: ICommissionRuleResponse | undefined;


        const ruleData: ICommissionRuleInput = {
            categoryId: createdCategoryDoc._id.toString(),
            flatFee: commissionRuleInput.flatFee,
            categoryCommission: commissionRuleInput.categoryCommission,
            status: commissionRuleInput.status ?? true,
        };

        const newRule = await this.commissionRuleRepository.create(ruleData);
        createdCommissionRule = newRule.toJSON() as unknown as ICommissionRuleResponse;


        return { category: categoryResponse, commissionRule: createdCommissionRule };
    }

    async updateCategory(
        categoryId: string,
        updateCategoryInput: Partial<ICategoryInput>,
        commissionRuleInput?: ServiceCommissionRuleInput
    ): Promise<{ category: ICategoryResponse | null; commissionRule?: ICommissionRuleResponse | null }> {
        if (!Types.ObjectId.isValid(categoryId)) {
            throw new Error('Invalid category ID.');
        }

        const existingCategory = await this.categoryRepository.findById(categoryId);

        if (!existingCategory) {
            throw new Error('Category not found.');
        }

        if (updateCategoryInput.parentId !== undefined) {
            if (updateCategoryInput.parentId === null) {
                updateCategoryInput.parentId = null;
            } else if (typeof updateCategoryInput.parentId === 'string' && Types.ObjectId.isValid(updateCategoryInput.parentId)) {
                const newParentObjectId = new Types.ObjectId(updateCategoryInput.parentId);
                if (existingCategory._id.equals(newParentObjectId)) {
                    throw new Error('Category cannot be its own parent.');
                }
                const parentCategory = await this.categoryRepository.findById(newParentObjectId);
                if (!parentCategory) {
                    throw new Error('New parent category not found.');
                }
                updateCategoryInput.parentId = newParentObjectId.toString(); // Store as string for input
            } else {
                throw new Error('Invalid parent category ID provided.');
            }
        }

        if (updateCategoryInput.name && updateCategoryInput.name !== existingCategory.name) {
            let existingWithNewName: ICategory | null = null;
            const targetParentId = updateCategoryInput.parentId !== undefined
                ? (updateCategoryInput.parentId === null ? null : new Types.ObjectId(updateCategoryInput.parentId))
                : existingCategory.parentId;

            if (targetParentId) {
                existingWithNewName = await this.categoryRepository.findByNameAndParent(updateCategoryInput.name, targetParentId);
            } else {
                existingWithNewName = await this.categoryRepository.findByName(updateCategoryInput.name);
            }


            if (existingWithNewName && existingWithNewName._id.toString() !== categoryId) {
                if (targetParentId) {
                    throw new Error('A subcategory with this name already exists under the specified parent.');
                } else {
                    throw new Error('A top-level category with this name already exists.');
                }
            }
        }


        const updatedCategoryDoc = await this.categoryRepository.update(categoryId, updateCategoryInput);
        const updatedCategory: ICategoryResponse | null = updatedCategoryDoc ? updatedCategoryDoc.toJSON() as unknown as ICategoryResponse : null;

        let updatedCommissionRule: ICommissionRuleResponse | null | undefined;

        if (commissionRuleInput !== undefined) {
            const existingRule = await this.commissionRuleRepository.findByCategoryId(categoryId);

            if (commissionRuleInput.removeRule) {
                if (existingRule) {
                    await this.commissionRuleRepository.delete(existingRule._id);
                    updatedCommissionRule = null;
                }
            } else {
                const ruleData: ICommissionRuleInput = {
                    categoryId: categoryId,
                    flatFee: commissionRuleInput.flatFee ?? 0,
                    categoryCommission: commissionRuleInput.categoryCommission ?? 0,
                    status: commissionRuleInput.status ?? true,
                };


                if (existingRule) {
                    const result = await this.commissionRuleRepository.update(existingRule._id, ruleData);
                    updatedCommissionRule = result ? result.toJSON() as unknown as ICommissionRuleResponse : null;
                } else {
                    const result = await this.commissionRuleRepository.create(ruleData);
                    updatedCommissionRule = result ? result.toJSON() as unknown as ICommissionRuleResponse : null;
                }
            }
        }



        return { category: updatedCategory, commissionRule: updatedCommissionRule };
    }

    async updateManySubcategoriesStatus(parentCategoryId: string, status: boolean): Promise<void> {
        await this.categoryRepository.updateSubcategoriesStatus(parentCategoryId, status);
    }



    async getCategoryById(categoryId: string): Promise<{ category: ICategoryResponse; commissionRule?: ICommissionRuleResponse | null }> {
        if (!Types.ObjectId.isValid(categoryId)) {
            throw new Error('Invalid category ID.');
        }
        const categoryDoc = await this.categoryRepository.findById(categoryId);
        const subCategoryDoc = await this.categoryRepository.findAll({ parentId: new Types.ObjectId(categoryId) });
        if (!categoryDoc) {
            throw new Error('Category not found.');
        }

        const category = categoryDoc.toJSON() as unknown as ICategoryResponse;

        let commissionRule: ICommissionRuleResponse | null = null;
        if (categoryDoc) {
            const ruleDoc = await this.commissionRuleRepository.findByCategoryId(categoryId);
            commissionRule = ruleDoc ? ruleDoc.toJSON() as unknown as ICommissionRuleResponse : null;
        }

        return {
            category: category,
            commissionRule: commissionRule,

        };
    }


    async getAllTopLevelCategoriesWithDetails(): Promise<Array<ICategoryResponse>> {
        const topLevelCategoryDocs = await this.categoryRepository.findAll({ parentId: null });
        const subCategories = await this.categoryRepository.findAllSubcategories({});

        const resultPromises = topLevelCategoryDocs.map(async (catDoc) => {
            const category = catDoc.toJSON() as unknown as ICategoryResponse;
            const subCategoryCount = await this.categoryRepository.countSubcategories(catDoc._id);
            const commissionRuleDoc = await this.commissionRuleRepository.findByCategoryId(catDoc._id);
            const commissionRule = commissionRuleDoc ? commissionRuleDoc.toJSON() as unknown as ICommissionRuleResponse : null;

            const finalCategory: ICategoryResponse = {
                ...category,
                parentId: category.parentId || null,
                subCategoryCount,
                commissionRule,
                subCategories: subCategories.map((subCat: any) => subCat.toJSON() as unknown as ICategoryResponse)
            };
            return finalCategory;
        });
        return Promise.all(resultPromises);
    }


    async getAllSubcategories(parentId: string): Promise<ICategoryFormCombinedData[]> {
        if (!Types.ObjectId.isValid(parentId)) {
            throw new Error('Invalid parent ID.');
        }

        const subcategoryDocs = await this.categoryRepository.findAll({
            parentId: new Types.ObjectId(parentId),
        });

        const subcategoriesWithRule = await Promise.all(
            subcategoryDocs.map(async (doc) => {
                const raw = doc.toJSON();


                const commonData = {
                    _id: raw._id.toString(),
                    name: raw.name,
                    description: raw.description || '',
                    iconUrl: raw.iconUrl || null,
                    status: raw.status ?? false,
                    parentId: raw.parentId ? raw.parentId.toString() : null,
                };

                const commissionRuleDoc = await this.commissionRuleRepository.findByCategoryId(doc._id);
                const mappedSubCategoryForFrontend: ICategoryFormCombinedData = {
                    ...commonData,
                    commissionType: 'none',
                    commissionValue: '',
                    commissionStatus: false,
                };
                if (commissionRuleDoc) {
                    if (commissionRuleDoc.categoryCommission !== undefined && commissionRuleDoc.categoryCommission !== null && commissionRuleDoc.categoryCommission !== 0) {
                        mappedSubCategoryForFrontend.commissionType = 'percentage';
                        mappedSubCategoryForFrontend.commissionValue = commissionRuleDoc.categoryCommission;
                    } else if (commissionRuleDoc.flatFee !== undefined && commissionRuleDoc.flatFee !== null && commissionRuleDoc.flatFee !== 0) {
                        mappedSubCategoryForFrontend.commissionType = 'flatFee';
                        mappedSubCategoryForFrontend.commissionValue = commissionRuleDoc.flatFee;
                    }
                    mappedSubCategoryForFrontend.commissionStatus = commissionRuleDoc.status ?? false;
                }
                return {...mappedSubCategoryForFrontend};
            })
        );
        return subcategoriesWithRule
         
    }




    async deleteCategory(categoryId: string): Promise<ICategoryResponse> {
        if (!Types.ObjectId.isValid(categoryId)) {
            throw new Error('Invalid category ID.');
        }

        const categoryToDelete = await this.categoryRepository.findById(categoryId);
        if (!categoryToDelete) {
            throw new Error('Category not found.');
        }

        const subcategories = await this.categoryRepository.findAll({ parentId: new Types.ObjectId(categoryId) });
        if (subcategories.length > 0) {
            throw new Error('Cannot delete category with existing subcategories. Delete subcategories first.');
        }

        const deletedCategoryDoc = await this.categoryRepository.delete(categoryId);
        if (!deletedCategoryDoc) {
            throw new Error('Category not found (already deleted or concurrent modification).');
        }

        if (!deletedCategoryDoc.parentId) {
            const commissionRule = await this.commissionRuleRepository.findByCategoryId(categoryId);
            if (commissionRule) {
                await this.commissionRuleRepository.delete(commissionRule._id);
            }
        }
        return deletedCategoryDoc.toJSON() as unknown as ICategoryResponse;
    }
}