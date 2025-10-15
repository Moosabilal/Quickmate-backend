import { CategoryRepository } from '../../repositories/implementation/categoryRepository';
import { CommissionRuleRepository } from '../../repositories/implementation/commissionRuleRepository';
import { ICategoryFormCombinedData, ICategoryInput, ICategoryResponse, ICommissionRuleInput, ICommissionRuleResponse, IserviceResponse } from '../../interface/category';
import { ICategory } from '../../models/Categories';
import { Types } from 'mongoose';
import { inject, injectable } from 'inversify';
import { ICategoryRepository } from '../../repositories/interface/ICategoryRepository';
import TYPES from '../../di/type';
import { ICommissionRuleRepository } from '../../repositories/interface/ICommissonRuleRepository';
import { ICategoryService } from '../interface/ICategoryService';
import { CommissionTypes } from '../../enums/CommissionType.enum';
import { CustomError } from '../../utils/CustomError';
import { HttpStatusCode } from '../../enums/HttpStatusCode';
import { toHomePageDTO } from '../../utils/mappers/category.mapper';
import { ICommissionRule } from '../../models/Commission';


@injectable()
export class CategoryService implements ICategoryService {
    private _categoryRepository: ICategoryRepository;
    private _commissionRuleRepository: ICommissionRuleRepository;

    constructor(@inject(TYPES.CategoryRepository) categoryRepository: ICategoryRepository, 
        @inject(TYPES.CommissionRuleRepository) commissionRuleRepository: ICommissionRuleRepository
    ) {
        this._categoryRepository = categoryRepository
        this._commissionRuleRepository = commissionRuleRepository
    }


    async createCategory(
        categoryInput: ICategoryInput,
        commissionRuleInput?: ICommissionRuleInput
    ): Promise<{ category: ICategoryResponse; commissionRule?: ICommissionRuleResponse }> {

        if (categoryInput.parentId) {
            const parentCategory = await this._categoryRepository.findOne({_id: categoryInput.parentId});
            if (!parentCategory) {
                throw new CustomError('Parent category not found.', HttpStatusCode.NOT_FOUND);
            }
            const existingSubcategory = await this._categoryRepository.findSubCatByName(categoryInput.name);
            if (existingSubcategory) {
                throw new CustomError('A subcategory with this name already exists under the parent.', HttpStatusCode.CONFLICT);
            }
        } else {
            const existingTopLevelCategory = await this._categoryRepository.findByName(categoryInput.name);
            if (existingTopLevelCategory) {
                throw new CustomError('A top-level category with this name already exists.', HttpStatusCode.CONFLICT);
            }
        }


        const categoryDataToCreate: Partial<ICategory> = {
            ...categoryInput,
            parentId: categoryInput.parentId
                ? new Types.ObjectId(categoryInput.parentId)
                : null,
            status: categoryInput.status ?? true,
        };

        const createdCategoryDoc = await this._categoryRepository.create(categoryDataToCreate);

        const categoryResponse: ICategoryResponse = createdCategoryDoc.toJSON() as unknown as ICategoryResponse;

        let createdCommissionRule: ICommissionRuleResponse | undefined;

        const ruleData: Partial<ICommissionRule> = {
            categoryId: createdCategoryDoc._id ? new Types.ObjectId(createdCategoryDoc._id) : null,
            commissionType: commissionRuleInput.commissionType,
            commissionValue: commissionRuleInput.commissionValue,
            status: commissionRuleInput.status ?? true,
        };

        const newRule = await this._commissionRuleRepository.create(ruleData);
        createdCommissionRule = newRule.toJSON() as unknown as ICommissionRuleResponse;

        return { category: categoryResponse, commissionRule: createdCommissionRule };
    }

    async updateCategory(
        categoryId: string,
        updateCategoryInput: Partial<ICategoryInput>,
        commissionRuleInput?: ICommissionRuleInput
    ): Promise<{ category: ICategoryResponse | null; commissionRule?: ICommissionRuleResponse | null }> {
        if (!Types.ObjectId.isValid(categoryId)) {
            throw new Error('Invalid category ID.');
        }

        const existingCategory = await this._categoryRepository.findById(categoryId);

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
                const parentCategory = await this._categoryRepository.findOne({parentId: newParentObjectId.toString()});
                if (!parentCategory) {
                    throw new Error('New parent category not found.');
                }
                updateCategoryInput.parentId = newParentObjectId.toString();
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
                existingWithNewName = await this._categoryRepository.findByNameAndParent(updateCategoryInput.name, targetParentId);
            } else {
                existingWithNewName = await this._categoryRepository.findByName(updateCategoryInput.name);
            }


            if (existingWithNewName && existingWithNewName._id.toString() !== categoryId) {
                if (targetParentId) {
                    throw new Error('A subcategory with this name already exists under the specified parent.');
                } else {
                    throw new Error('A top-level category with this name already exists.');
                }
            }
        }


        const updatedCategoryDoc = await this._categoryRepository.update(categoryId, updateCategoryInput);
        const updatedCategory: ICategoryResponse | null = updatedCategoryDoc ? updatedCategoryDoc.toJSON() as unknown as ICategoryResponse : null;

        let updatedCommissionRule: ICommissionRuleResponse | null | undefined;
        if (commissionRuleInput !== undefined) {
            const existingRule = await this._commissionRuleRepository.findOne({cateogoryId: categoryId});

            if (commissionRuleInput.commissionType === CommissionTypes.NONE) {
                if (existingRule) {
                    await this._commissionRuleRepository.delete(existingRule._id);
                    updatedCommissionRule = null;
                }
            } else {
                const ruleData = {
                    categoryId: categoryId ? new Types.ObjectId(categoryId) : null,
                    commissionType: commissionRuleInput.commissionType,
                    commissionValue: commissionRuleInput.commissionValue,
                    status: commissionRuleInput.status ?? true,
                } as any;


                if (existingRule) {
                    const result = await this._commissionRuleRepository.update(existingRule._id.toString(), ruleData);
                    updatedCommissionRule = result ? result.toJSON() as unknown as ICommissionRuleResponse : null;
                } else {
                    const result = await this._commissionRuleRepository.create(ruleData);
                    updatedCommissionRule = result ? result.toJSON() as unknown as ICommissionRuleResponse : null;
                }
            }
        }



        return { category: updatedCategory, commissionRule: updatedCommissionRule };
    }

    async updateManySubcategoriesStatus(parentCategoryId: string, status: boolean): Promise<void> {
        await this._categoryRepository.updateSubcategoriesStatus(parentCategoryId, status);
    }



    async getCategoryById(categoryId: string): Promise<{ category: ICategoryResponse; commissionRule?: ICommissionRuleResponse | null }> {
        if (!Types.ObjectId.isValid(categoryId)) {
            throw new Error('Invalid category ID.');
        }
        const categoryDoc = await this._categoryRepository.findById(categoryId);
        const subCategoryDoc = await this._categoryRepository.findAll({ parentId: new Types.ObjectId(categoryId) });
        if (!categoryDoc) {
            throw new Error('Category not found.');
        }

        const category = categoryDoc.toJSON() as unknown as ICategoryResponse;

        let commissionRule: ICommissionRuleResponse | null = null;
        if (categoryDoc) {
            const ruleDoc = await this._commissionRuleRepository.findOne({categoryId: categoryId});
            commissionRule = ruleDoc ? ruleDoc.toJSON() as unknown as ICommissionRuleResponse : null;
        }

        return {
            category: category,
            commissionRule: commissionRule,

        };
    }

    async getAllTopCategories(): Promise<IserviceResponse[]> {
        const categories = await this._categoryRepository.getAllMainCategories()
        if (!categories) {
            throw new CustomError("Service not found, Please try again later", HttpStatusCode.NOT_FOUND)
        }
        return categories.map(category => toHomePageDTO(category))

    }


    async getAllCategoriesWithDetails(): Promise<Array<ICategoryResponse>> {
        const topLevelCategoryDocs = await this._categoryRepository.findAll({ parentId: null });
        const subCategories = await this._categoryRepository.findAllSubcategories({});
        const resultPromises = topLevelCategoryDocs.map(async (catDoc) => {
            const category = catDoc.toJSON() as unknown as ICategoryResponse;
            const subCategoryCount = await this._categoryRepository.countSubcategories(catDoc._id);
            const commissionRuleDoc = await this._commissionRuleRepository.findOne({categoryId: catDoc._id});
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
        const subcategoryDocs = await this._categoryRepository.findAll({
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

                const commissionRuleDoc = await this._commissionRuleRepository.findOne({categoryId: doc._id.toString()});
                const mappedSubCategoryForFrontend: ICategoryFormCombinedData = {
                    ...commonData,
                    commissionType: CommissionTypes.NONE,
                    commissionValue: 0,
                    commissionStatus: false,
                };
                if (commissionRuleDoc) {
                    mappedSubCategoryForFrontend.commissionType = commissionRuleDoc.commissionType;
                    mappedSubCategoryForFrontend.commissionValue = commissionRuleDoc.commissionValue;
                    mappedSubCategoryForFrontend.commissionStatus = commissionRuleDoc.status ?? false;
                }
                return { ...mappedSubCategoryForFrontend };
            })
        );
        return subcategoriesWithRule

    }

    async deleteCategory(categoryId: string): Promise<ICategoryResponse> {
        if (!Types.ObjectId.isValid(categoryId)) {
            throw new Error('Invalid category ID.');
        }

        const categoryToDelete = await this._categoryRepository.findById(categoryId);
        if (!categoryToDelete) {
            throw new Error('Category not found.');
        }

        const subcategories = await this._categoryRepository.findAll({ parentId: new Types.ObjectId(categoryId) });
        if (subcategories.length > 0) {
            throw new Error('Cannot delete category with existing subcategories. Delete subcategories first.');
        }

        const deletedCategoryDoc = await this._categoryRepository.delete(categoryId);
        if (!deletedCategoryDoc) {
            throw new Error('Category not found (already deleted or concurrent modification).');
        }

        if (!deletedCategoryDoc.parentId) {
            const commissionRule = await this._commissionRuleRepository.findOne({categoryId: categoryId});
            if (commissionRule) {
                await this._commissionRuleRepository.delete(commissionRule._id);
            }
        }
        return deletedCategoryDoc.toJSON() as unknown as ICategoryResponse;
    }

    async getSubcategories(page: number, limit: number, search: string): Promise<{
        allServices: IserviceResponse[];
        total: number;
        totalPages: number;
        currentPage: number
    }> {
        const skip = (page - 1) * limit;
        const filter: any = {
            name: { $regex: search, $options: 'i' },
            parentId: { $ne: null }
        }
        const services = await this._categoryRepository.findAllSubCategories(filter, skip, limit);
        const total = await this._categoryRepository.countOfSubCategories(filter)
        const featuredServices = services.map(service => {
            return {
                id: service._id.toString(),
                name: service.name,
                iconUrl: service.iconUrl,
                parentId: service.parentId.toString()
            }

        })
        return {
            allServices: featuredServices,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        }
    }
}