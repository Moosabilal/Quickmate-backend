import { CategoryRepository } from '../../repositories/implementation/categoryRepository';
import { CommissionRuleRepository } from '../../repositories/implementation/commissionRuleRepository';
import { ICategoryFormCombinedData, ICategoryInput, ICategoryResponse, ICommissionRuleInput, ICommissionRuleResponse, IserviceResponse } from '../../dto/category.dto';
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
import { toHomePageDTO } from '../../mappers/category.mapper';


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
        commissionRuleInput?: ICommissionRuleInput
    ): Promise<{ category: ICategoryResponse; commissionRule?: ICommissionRuleResponse }> {

        let parentObjectId: Types.ObjectId | null = null;
        if (categoryInput.parentId) {
            if (!Types.ObjectId.isValid(categoryInput.parentId)) {
                throw new CustomError('Invalid parent category ID.',HttpStatusCode.BAD_REQUEST);
            }

            parentObjectId = new Types.ObjectId(categoryInput.parentId);
            const parentCategory = await this.categoryRepository.findById(parentObjectId);
            if (!parentCategory) {
                throw new CustomError('Parent category not found.', HttpStatusCode.NOT_FOUND);
            }
            const existingSubcategory = await this.categoryRepository.findByNameAndParent(categoryInput.name, parentObjectId);
            if (existingSubcategory) {
                throw new CustomError('A subcategory with this name already exists under the specified parent.', HttpStatusCode.CONFLICT);
            }
        } else {
            const existingTopLevelCategory = await this.categoryRepository.findByName(categoryInput.name);
            if (existingTopLevelCategory) {
                throw new CustomError('A top-level category with this name already exists.', HttpStatusCode.CONFLICT);
            }
        }


        const categoryDataToCreate: ICategoryInput = {
            ...categoryInput,
            parentId: parentObjectId ? parentObjectId.toString() : null,
            status: categoryInput.status ?? true,
        };

        const createdCategoryDoc = await this.categoryRepository.create(categoryDataToCreate as Partial<ICategory>);

        const categoryResponse: ICategoryResponse = createdCategoryDoc.toJSON() as unknown as ICategoryResponse;

        let createdCommissionRule: ICommissionRuleResponse | undefined;

        const ruleData: ICommissionRuleInput = {
            categoryId: createdCategoryDoc._id.toString(),
            commissionType: commissionRuleInput.commissionType,
            commissionValue: commissionRuleInput.commissionValue,
            status: commissionRuleInput.status ?? true,
        };

        const newRule = await this.commissionRuleRepository.create(ruleData);
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

            if (commissionRuleInput.commissionType === CommissionTypes.NONE) {
                if (existingRule) {
                    await this.commissionRuleRepository.delete(existingRule._id);
                    updatedCommissionRule = null;
                }
            } else {
                const ruleData: ICommissionRuleInput = {
                    categoryId: categoryId,
                    commissionType: commissionRuleInput.commissionType,
                    commissionValue: commissionRuleInput.commissionValue,
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

    async getAllTopCategories(): Promise<IserviceResponse[]> {
        const categories = await this.categoryRepository.getAllMainCategories()
        if(!categories){
            throw new CustomError("Service not found, Please try again later", HttpStatusCode.NOT_FOUND)
        }
        console.log('the cat')
        return categories.map(category => toHomePageDTO(category))
    
    }


    async getAllCategoriesWithDetails(): Promise<Array<ICategoryResponse>> {
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

    async getSubcategories(page: number, limit: number, search: string): Promise<{
        allServices: IserviceResponse[];
        total: number;
        totalPages: number;
        currentPage: number
    }> {
        const skip = (page - 1) * limit;
        const filter: any = {
            name: { $regex: search, $options: 'i' },
            parentId:{ $ne:null }}
        const services = await this.categoryRepository.findAllSubCategories(filter, skip, limit);
        const total = await this.categoryRepository.countOfSubCategories(filter)
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