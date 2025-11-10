import { CategoryRepository } from '../../repositories/implementation/categoryRepository';
import { CommissionRuleRepository } from '../../repositories/implementation/commissionRuleRepository';
import { ICategoryFormCombinedData, ICategoryInput, ICategoryResponse, ICommissionRuleInput, ICommissionRuleResponse, ICommissionSummary, IserviceResponse } from '../../interface/category';
import { ICategory } from '../../models/Categories';
import { FilterQuery, Types } from 'mongoose';
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
import { endOfDay, startOfDay, subDays } from 'date-fns';
import { IPaymentRepository } from '../../repositories/interface/IPaymentRepository';
import { IBookingRepository } from '../../repositories/interface/IBookingRepository';


@injectable()
export class CategoryService implements ICategoryService {
    private _categoryRepository: ICategoryRepository;
    private _commissionRuleRepository: ICommissionRuleRepository;
    private _paymentRepository: IPaymentRepository;
    private _bookingRepository: IBookingRepository;

    constructor(@inject(TYPES.CategoryRepository) categoryRepository: ICategoryRepository,
        @inject(TYPES.CommissionRuleRepository) commissionRuleRepository: ICommissionRuleRepository,
        @inject(TYPES.PaymentRepository) paymentRepository: IPaymentRepository,
        @inject(TYPES.BookingRepository) bookingRepository: IBookingRepository
    ) {
        this._categoryRepository = categoryRepository
        this._commissionRuleRepository = commissionRuleRepository
        this._paymentRepository = paymentRepository
        this._bookingRepository = bookingRepository
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

        await this._validateParentCategory(categoryId, updateData.parentId);
        await this._validateNameUniqueness(categoryId, updateData, existingCategory);

        const updatedCategoryDoc = await this._categoryRepository.update(categoryId, updateData);
        const updatedCategory = updatedCategoryDoc ? toCategoryResponseDTO(updatedCategoryDoc) : null;

        let updatedCommissionRule = await this._handleCommissionRuleUpdate(categoryId, commissionRuleData);

        if (updateData.status !== undefined) {
            const newStatus = updateData.status;

            await this._commissionRuleRepository.updateStatusForCategoryIds([existingCategory._id], newStatus);

            if (!existingCategory.parentId) {
                const subcategoryIds = await this._categoryRepository.findSubcategoryIds(categoryId.toString());

                if (subcategoryIds.length > 0) {
                    await this._categoryRepository.updateStatusForIds(subcategoryIds, newStatus);

                    await this._commissionRuleRepository.updateStatusForCategoryIds(subcategoryIds, newStatus);
                }
            }

            const rule = await this._commissionRuleRepository.findOne({ categoryId });
            updatedCommissionRule = rule ? toCommissionRuleResponseDTO(rule) : null;
        }

        return { category: updatedCategory, commissionRule: updatedCommissionRule };
    }


    async updateManySubcategoriesStatus(parentCategoryId: string, status: boolean): Promise<void> {
        await this._categoryRepository.updateSubcategoriesStatus(parentCategoryId, status);
    }



    async getCategoryById(categoryId: string): Promise<{ categoryDetails: ICategoryFormCombinedData; subCategories: ICategoryFormCombinedData[] }> {
        const [categoryDoc, commissionRuleDoc, subCategoryDocs] = await Promise.all([
            this._categoryRepository.findById(categoryId),
            this._commissionRuleRepository.findOne({ categoryId: categoryId }),
            this._categoryRepository.findAll({ parentId: new Types.ObjectId(categoryId) })
        ]);

        if (!categoryDoc) {
            throw new Error('Category not found.');
        }

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

        const subCategoryIds = subCategoryDocs.map(sub => sub._id);
        let allSubCategoryRules: ICommissionRule[] = [];
        if (subCategoryIds.length > 0) {
            allSubCategoryRules = await this._commissionRuleRepository.findAll({
                categoryId: { $in: subCategoryIds }
            });
        }

        const commissionRulesMap = new Map(
            allSubCategoryRules.map(rule => [rule.categoryId.toString(), rule])
        );

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

        return {
            categoryDetails,
            subCategories
        };
    }

    async getCategoryForEdit(categoryId: string): Promise<ICategoryFormCombinedData> {
        const [categoryDoc, commissionRuleDoc] = await Promise.all([
            this._categoryRepository.findById(categoryId),
            this._commissionRuleRepository.findOne({ categoryId: categoryId })
        ]);

        if (!categoryDoc) {
            throw new Error('Category not found.');
        }

        const categoryDetails: ICategoryFormCombinedData = {
            id: categoryDoc._id.toString(),
            name: categoryDoc.name,
            description: categoryDoc.description || '',
            iconUrl: categoryDoc.iconUrl || null,
            status: categoryDoc.status ?? false,
            parentId: categoryDoc.parentId ? categoryDoc.parentId.toString() : null,
            commissionType: CommissionTypes.NONE,
            commissionValue: '',
            commissionStatus: false,
        };

        if (commissionRuleDoc) {
            categoryDetails.commissionType = commissionRuleDoc.commissionType;
            categoryDetails.commissionValue = commissionRuleDoc.commissionValue || '';
            categoryDetails.commissionStatus = commissionRuleDoc.status ?? false;
        }

        return categoryDetails;
    }


    async getAllCategoriesWithDetails(
        page: number,
        limit: number,
        search?: string
    ): Promise<{
        data: ICategoryFormCombinedData[];
        total: number;
        totalPages: number;
    }> {

        const filter: FilterQuery<ICategory> = { parentId: null };
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        const { categories, total } = await this._categoryRepository.findCategoriesWithDetails({
            filter,
            page,
            limit
        });

        const mappedData = categories.map(cat => {
            const categoryWithExtras = cat as any;

            return {
                id: categoryWithExtras._id.toString(),
                name: categoryWithExtras.name,
                description: categoryWithExtras.description || '',
                iconUrl: categoryWithExtras.iconUrl || null,
                status: categoryWithExtras.status ?? false,
                parentId: categoryWithExtras.parentId ? categoryWithExtras.parentId.toString() : null,

                subCategoriesCount: categoryWithExtras.subCategoryCount || 0,
                commissionType: categoryWithExtras.commissionRule?.commissionType || CommissionTypes.NONE,
                commissionValue: categoryWithExtras.commissionRule?.commissionValue || '',
                commissionStatus: categoryWithExtras.commissionRule?.status ?? false,
            };
        });

        return {
            data: mappedData,
            total,
            totalPages: Math.ceil(total / limit)
        };
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
        const [services, total] = await Promise.all([
            this._categoryRepository.findAllSubCategories(search, skip, limit),
            this._categoryRepository.countOfSubCategories(search),
        ]);
        
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

        const resultDoc = await this._commissionRuleRepository.createOrUpdate(categoryId, commissionRuleInput);

        return resultDoc ? toCommissionRuleResponseDTO(resultDoc) : null;
    }

    private async _validateParentCategory(categoryId: string, newParentId?: string | null): Promise<void> {
        if (newParentId === undefined) return;

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

    private async _validateNameUniqueness(
        categoryId: string,
        updateData: Partial<ICategoryInput>,
        existingCategory: ICategory
    ): Promise<void> {
        if (!updateData.name || updateData.name === existingCategory.name) {
            return;
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

    public async getCommissionSummary(): Promise<ICommissionSummary> {
        const now = new Date();
        const currentPeriodStart = startOfDay(subDays(now, 30));
        const currentPeriodEnd = endOfDay(now);

        const previousPeriodStart = startOfDay(subDays(now, 60));
        const previousPeriodEnd = endOfDay(subDays(now, 31));

        const [currentPayments, previousPayments, currentBookingsCount, previousBookingsCount] = await Promise.all([
            this._paymentRepository.getTotalsInDateRange(currentPeriodStart, currentPeriodEnd),
            this._paymentRepository.getTotalsInDateRange(previousPeriodStart, previousPeriodEnd),
            this._bookingRepository.countInDateRange(currentPeriodStart, currentPeriodEnd),
            this._bookingRepository.countInDateRange(previousPeriodStart, previousPeriodEnd)
        ]);

        const calculateChange = (current: number, previous: number) => {
            if (previous === 0) {
                return current > 0 ? 100 : 0;
            }
            return ((current - previous) / previous) * 100;
        };

        const avgCommissionCurrent = currentBookingsCount > 0 ? currentPayments.totalCommission / currentBookingsCount : 0;
        const avgCommissionPrevious = previousBookingsCount > 0 ? previousPayments.totalCommission / previousBookingsCount : 0;

        return {
            totalCommissionRevenue: currentPayments.totalCommission,
            totalCommissionRevenueChange: calculateChange(currentPayments.totalCommission, previousPayments.totalCommission),

            averageCommissionPerBooking: avgCommissionCurrent,
            averageCommissionPerBookingChange: calculateChange(avgCommissionCurrent, avgCommissionPrevious),

            totalBookings: currentBookingsCount,
            totalBookingsChange: calculateChange(currentBookingsCount, previousBookingsCount),

            commissionDeductionsToProviders: currentPayments.totalProviderAmount,
            commissionDeductionsToProvidersChange: calculateChange(currentPayments.totalProviderAmount, previousPayments.totalProviderAmount)
        };
    }

    public async getTopLevelCategories(): Promise<ICategoryResponse[]> {
        const categories = await this._categoryRepository.findAll({
            parentId: null,
            status: true
        });
        return categories.map(toCategoryResponseDTO);
    }

    public async getPopularServices(): Promise<IserviceResponse[]> {
        const services = await this._categoryRepository.findActiveSubCategories({ createdAt: -1 }, 0, 5);

        return services.map(s => ({
            id: s._id.toString(),
            name: s.name,
            iconUrl: s.iconUrl,
            parentId: s.parentId.toString(),
            description: s.description || '',
        }));
    }

    public async getTrendingServices(): Promise<IserviceResponse[]> {
        const services = await this._categoryRepository.findActiveSubCategories({ createdAt: -1 }, 5, 6);

        return services.map(s => ({
            id: s._id.toString(),
            name: s.name,
            iconUrl: s.iconUrl,
            parentId: s.parentId.toString(),
            description: s.description || '',
        }));
    }

    public async getTopLevelCategoryNames(): Promise<string[]> {
        const categories = await this._categoryRepository.findAll({
            parentId: null,
            status: true
        });
        return categories.map(cat => cat.name);
    }

    public async getSubcategoriesForCategory(parentCategoryName: string): Promise<string[]> {
        const parentCategory = await this._categoryRepository.findOne({
            name: { $regex: new RegExp(`^${parentCategoryName}$`, 'i') },
            parentId: null
        });

        if (!parentCategory) {
            return [];
        }

        const subCategories = await this._categoryRepository.findAll({
            parentId: parentCategory._id,
            status: true
        });

        return subCategories.map(cat => cat.name);
    }
}