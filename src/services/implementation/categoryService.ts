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
import { toCategoryResponseDTO, toCommissionRuleResponseDTO, toHomePageDTO } from '../../utils/mappers/category.mapper';
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
            const parentCategory = await this._categoryRepository.findOne({ _id: categoryInput.parentId });
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

    public async updateCategory(
        categoryId: string,
        updateData: Partial<ICategoryInput>,
        commissionRuleData?: ICommissionRuleInput
    ): Promise<{ category: ICategoryResponse | null; commissionRule?: ICommissionRuleResponse | null }> {

        const existingCategory = await this._categoryRepository.findById(categoryId);
        if (!existingCategory) {
            throw new Error('Category not found.');
        }

        // --- 1. Perform Validations ---
        await this._validateParentCategory(categoryId, updateData.parentId);
        await this._validateNameUniqueness(categoryId, updateData, existingCategory);

        // --- 2. Update the Core Category Document ---
        const updatedCategoryDoc = await this._categoryRepository.update(categoryId, updateData);
        const updatedCategory = updatedCategoryDoc ? toCategoryResponseDTO(updatedCategoryDoc) : null;

        // --- 3. Handle Commission Rule ---
        let updatedCommissionRule = await this._handleCommissionRuleUpdate(categoryId, commissionRuleData);

        // --- 4. Handle Hierarchical Status Propagation ---
        if (updateData.status !== undefined) {
        const newStatus = updateData.status;

        // a) For ANY category (parent or sub), update its own commission rule status to match.
        await this._commissionRuleRepository.updateStatusForCategoryIds([existingCategory._id], newStatus);

        // b) If it's a PARENT category, propagate the status change downwards to all children.
        if (!existingCategory.parentId) {
            const subcategoryIds = await this._categoryRepository.findSubcategoryIds(categoryId.toString());
            
            if (subcategoryIds.length > 0) {
                // Update all subcategories' status
                await this._categoryRepository.updateStatusForIds(subcategoryIds, newStatus);
                
                // Update all subcategories' commission rule statuses
                await this._commissionRuleRepository.updateStatusForCategoryIds(subcategoryIds, newStatus);
            }
        }
        
        // Re-fetch the commission rule to ensure the returned data is fresh after propagation.
        const rule = await this._commissionRuleRepository.findOne({ categoryId });
        updatedCommissionRule = rule ? toCommissionRuleResponseDTO(rule) : null;
    }

        return { category: updatedCategory, commissionRule: updatedCommissionRule };
    }

    // ===========================================
    // 🔹 PRIVATE HELPER METHODS (Single Responsibility)
    // ====================================

    /**
     * RESPONSIBILITY: Creates, updates, or deletes a commission rule for a category.
     */
    

    async updateManySubcategoriesStatus(parentCategoryId: string, status: boolean): Promise<void> {
        await this._categoryRepository.updateSubcategoriesStatus(parentCategoryId, status);
    }



    async getCategoryById(categoryId: string): Promise<{ categoryDetails: ICategoryFormCombinedData; subCategories: ICategoryFormCombinedData[] }> {
    // 1. Fetch main category, its rule, and all its subcategories concurrently
    const [categoryDoc, commissionRuleDoc, subCategoryDocs] = await Promise.all([
        this._categoryRepository.findById(categoryId),
        this._commissionRuleRepository.findOne({ categoryId: categoryId }),
        this._categoryRepository.findAll({ parentId: new Types.ObjectId(categoryId) })
    ]);

    if (!categoryDoc) {
        throw new Error('Category not found.');
    }

    // 2. Map the main category to the ICategoryFormCombinedData format
    const categoryDetails: ICategoryFormCombinedData = {
        id: categoryDoc._id.toString(),
        name: categoryDoc.name,
        description: categoryDoc.description || '',
        iconUrl: categoryDoc.iconUrl || null,
        status: categoryDoc.status ?? false,
        parentId: categoryDoc.parentId ? categoryDoc.parentId.toString() : null,
        commissionType: commissionRuleDoc?.commissionType || CommissionTypes.NONE,
        commissionValue: commissionRuleDoc?.commissionValue ?? '',
        commissionStatus: commissionRuleDoc?.status ?? false,
    };

    // 3. Fetch all commission rules for all subcategories in a single efficient query
    const subCategoryIds = subCategoryDocs.map(sub => sub._id);
    let allSubCategoryRules: ICommissionRule[] = [];
    if (subCategoryIds.length > 0) {
        allSubCategoryRules = await this._commissionRuleRepository.findAll({
            categoryId: { $in: subCategoryIds }
        });
    }

    // 4. Create a Map for quick lookups
    const commissionRulesMap = new Map(
        allSubCategoryRules.map(rule => [rule.categoryId.toString(), rule])
    );

    // 5. Map subcategories to the ICategoryFormCombinedData format, flattening commission rules
    const subCategories = subCategoryDocs.map((sub): ICategoryFormCombinedData => {
        const subRule = commissionRulesMap.get(sub._id.toString());
        
        return {
            id: sub._id.toString(),
            name: sub.name,
            description: sub.description || '',
            iconUrl: sub.iconUrl || null,
            status: sub.status ?? false,
            parentId: sub.parentId ? sub.parentId.toString() : null,
            commissionType: subRule?.commissionType || CommissionTypes.NONE,
            commissionValue: subRule?.commissionValue ?? '',
            commissionStatus: subRule?.status ?? false,
        };
    });

    // 6. Return the final, correctly typed object
    return {
        categoryDetails,
        subCategories
    };
}

async getCategoryForEdit(categoryId: string): Promise<ICategoryFormCombinedData> {
    // 1. Fetch the category and its commission rule at the same time
    const [categoryDoc, commissionRuleDoc] = await Promise.all([
        this._categoryRepository.findById(categoryId),
        this._commissionRuleRepository.findOne({ categoryId: categoryId })
    ]);

    if (!categoryDoc) {
        throw new Error('Category not found.');
    }

    // 2. Map the fetched data into the exact ICategoryFormCombinedData shape
    const categoryDetails: ICategoryFormCombinedData = {
        id: categoryDoc._id.toString(),
        name: categoryDoc.name,
        description: categoryDoc.description || '',
        iconUrl: categoryDoc.iconUrl || null,
        status: categoryDoc.status ?? false,
        parentId: categoryDoc.parentId ? categoryDoc.parentId.toString() : null,
        // Set default commission values first
        commissionType: CommissionTypes.NONE,
        commissionValue: '',
        commissionStatus: false,
    };

    if (commissionRuleDoc) {
        categoryDetails.commissionType = commissionRuleDoc.commissionType;
        categoryDetails.commissionValue = commissionRuleDoc.commissionValue || '';
        categoryDetails.commissionStatus = commissionRuleDoc.status ?? false;
    }

    // 3. Return the single, flat object
    return categoryDetails;
}


    async getAllCategoriesWithDetails(): Promise<Array<ICategoryResponse>> {
        const topLevelCategoryDocs = await this._categoryRepository.findAll({ parentId: null });
        const subCategories = await this._categoryRepository.findAllSubcategories({});
        const resultPromises = topLevelCategoryDocs.map(async (catDoc) => {
            const category = catDoc.toJSON() as unknown as ICategoryResponse;
            const subCategoryCount = await this._categoryRepository.countSubcategories(catDoc._id);
            const commissionRuleDoc = await this._commissionRuleRepository.findOne({ categoryId: catDoc._id });
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

                const commissionRuleDoc = await this._commissionRuleRepository.findOne({ categoryId: doc._id.toString() });
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


    private async _handleCommissionRuleUpdate(
        categoryId: string,
        commissionRuleInput?: ICommissionRuleInput
    ): Promise<ICommissionRuleResponse | null> {

        if (commissionRuleInput === undefined) {
            // No changes to make, just return the existing rule if there is one
            const existingRule = await this._commissionRuleRepository.findOne({ categoryId });
            return existingRule ? toCommissionRuleResponseDTO(existingRule) : null;
        }

        const existingRule = await this._commissionRuleRepository.findOne({ categoryId });

        if (commissionRuleInput.commissionType === CommissionTypes.NONE) {
            if (existingRule) {
                await this._commissionRuleRepository.delete(existingRule._id.toString());
            }
            return null;
        }

        // The service no longer creates ObjectIds. It just passes the data along.
        const resultDoc = await this._commissionRuleRepository.createOrUpdate(categoryId, commissionRuleInput);

        return resultDoc ? toCommissionRuleResponseDTO(resultDoc) : null;
    }

    /**
     * RESPONSIBILITY: Validates the parentId for an update operation.
     */
    private async _validateParentCategory(categoryId: string, newParentId?: string | null): Promise<void> {
        if (newParentId === undefined) return; // Not being updated.

        if (newParentId !== null) {
            if (!Types.ObjectId.isValid(newParentId)) {
                throw new Error('Invalid parent category ID provided.');
            }
            if (categoryId === newParentId) {
                throw new Error('Category cannot be its own parent.');
            }
            const parentCategory = await this._categoryRepository.findById(newParentId);
            if (!parentCategory) {
                throw new Error('New parent category not found.');
            }
        }
    }

    /**
     * RESPONSIBILITY: Validates that the new name is unique for the given scope (parent or top-level).
     */
    private async _validateNameUniqueness(
        categoryId: string,
        updateData: Partial<ICategoryInput>,
        existingCategory: ICategory
    ): Promise<void> {
        if (!updateData.name || updateData.name === existingCategory.name) {
            return; // Name is not being changed.
        }

        const targetParentId = updateData.parentId !== undefined ? updateData.parentId : existingCategory.parentId;
        const existingWithNewName = targetParentId
            ? await this._categoryRepository.findByNameAndParent(updateData.name, targetParentId)
            : await this._categoryRepository.findByName(updateData.name);

        if (existingWithNewName && existingWithNewName._id.toString() !== categoryId) {
            const message = targetParentId
                ? 'A subcategory with this name already exists under the specified parent.'
                : 'A top-level category with this name already exists.';
            throw new Error(message);
        }
    }
}