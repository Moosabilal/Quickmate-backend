var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Types } from "mongoose";
import { inject, injectable } from "inversify";
import TYPES from "../../di/type";
import { CommissionTypes } from "../../enums/CommissionType.enum";
import { CustomError } from "../../utils/CustomError";
import { HttpStatusCode } from "../../enums/HttpStatusCode";
import { toCategoryResponseDTO, toCommissionRuleResponseDTO } from "../../utils/mappers/category.mapper";
import { endOfDay, startOfDay, subDays } from "date-fns";
import { getSignedUrl } from "../../utils/cloudinaryUpload";
let CategoryService = class CategoryService {
    _categoryRepository;
    _commissionRuleRepository;
    _paymentRepository;
    _bookingRepository;
    constructor(categoryRepository, commissionRuleRepository, paymentRepository, bookingRepository) {
        this._categoryRepository = categoryRepository;
        this._commissionRuleRepository = commissionRuleRepository;
        this._paymentRepository = paymentRepository;
        this._bookingRepository = bookingRepository;
    }
    async createCategory(categoryInput, commissionRuleInput) {
        if (categoryInput.parentId) {
            const parentCategory = await this._categoryRepository.findOne({
                _id: categoryInput.parentId,
            });
            if (!parentCategory) {
                throw new CustomError("Parent category not found.", HttpStatusCode.NOT_FOUND);
            }
            const existingSubcategory = await this._categoryRepository.findSubCatByName(categoryInput.name);
            if (existingSubcategory) {
                throw new CustomError("A subcategory with this name already exists under the parent.", HttpStatusCode.CONFLICT);
            }
        }
        else {
            const existingTopLevelCategory = await this._categoryRepository.findByName(categoryInput.name);
            if (existingTopLevelCategory) {
                throw new CustomError("A top-level category with this name already exists.", HttpStatusCode.CONFLICT);
            }
        }
        const categoryDataToCreate = {
            ...categoryInput,
            parentId: categoryInput.parentId ? new Types.ObjectId(categoryInput.parentId) : null,
            status: categoryInput.status ?? true,
        };
        const createdCategoryDoc = await this._categoryRepository.create(categoryDataToCreate);
        const categoryObj = createdCategoryDoc.toJSON();
        const categoryResponse = {
            ...categoryObj,
            iconUrl: categoryObj.iconUrl ? getSignedUrl(categoryObj.iconUrl) : null,
        };
        const ruleData = {
            categoryId: createdCategoryDoc._id ? new Types.ObjectId(createdCategoryDoc._id) : null,
            commissionType: commissionRuleInput.commissionType,
            commissionValue: commissionRuleInput.commissionValue,
            status: commissionRuleInput.status ?? true,
        };
        const newRule = await this._commissionRuleRepository.create(ruleData);
        const createdCommissionRule = newRule.toJSON();
        return {
            category: categoryResponse,
            commissionRule: createdCommissionRule,
        };
    }
    async updateCategory(categoryId, updateData, commissionRuleData) {
        const existingCategory = await this._categoryRepository.findById(categoryId);
        if (!existingCategory) {
            throw new Error("Category not found.");
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
    async updateManySubcategoriesStatus(parentCategoryId, status) {
        await this._categoryRepository.updateSubcategoriesStatus(parentCategoryId, status);
    }
    async getCategoryById(categoryId) {
        const [categoryDoc, commissionRuleDoc, subCategoryDocs] = await Promise.all([
            this._categoryRepository.findById(categoryId),
            this._commissionRuleRepository.findOne({ categoryId: categoryId }),
            this._categoryRepository.findAll({
                parentId: new Types.ObjectId(categoryId),
            }),
        ]);
        if (!categoryDoc) {
            throw new Error("Category not found.");
        }
        const categoryDetails = {
            id: categoryDoc._id.toString(),
            name: categoryDoc.name,
            description: categoryDoc.description || "",
            iconUrl: categoryDoc.iconUrl ? getSignedUrl(categoryDoc.iconUrl) : null,
            status: categoryDoc.status ?? false,
            parentId: categoryDoc.parentId ? categoryDoc.parentId.toString() : null,
            commissionType: commissionRuleDoc?.commissionType || CommissionTypes.NONE,
            commissionValue: commissionRuleDoc?.commissionValue ?? "",
            commissionStatus: commissionRuleDoc?.status ?? false,
        };
        const subCategoryIds = subCategoryDocs.map((sub) => sub._id);
        let allSubCategoryRules = [];
        if (subCategoryIds.length > 0) {
            allSubCategoryRules = await this._commissionRuleRepository.findAll({
                categoryId: { $in: subCategoryIds },
            });
        }
        const commissionRulesMap = new Map(allSubCategoryRules.map((rule) => [rule.categoryId.toString(), rule]));
        const subCategories = subCategoryDocs.map((sub) => {
            const subRule = commissionRulesMap.get(sub._id.toString());
            return {
                id: sub._id.toString(),
                name: sub.name,
                description: sub.description || "",
                iconUrl: sub.iconUrl ? getSignedUrl(sub.iconUrl) : null,
                status: sub.status ?? false,
                parentId: sub.parentId ? sub.parentId.toString() : null,
                commissionType: subRule?.commissionType || CommissionTypes.NONE,
                commissionValue: subRule?.commissionValue ?? "",
                commissionStatus: subRule?.status ?? false,
            };
        });
        return {
            categoryDetails,
            subCategories,
        };
    }
    async getCategoryForEdit(categoryId) {
        const [categoryDoc, commissionRuleDoc] = await Promise.all([
            this._categoryRepository.findById(categoryId),
            this._commissionRuleRepository.findOne({ categoryId: categoryId }),
        ]);
        if (!categoryDoc) {
            throw new Error("Category not found.");
        }
        const categoryDetails = {
            id: categoryDoc._id.toString(),
            name: categoryDoc.name,
            description: categoryDoc.description || "",
            iconUrl: categoryDoc.iconUrl ? getSignedUrl(categoryDoc.iconUrl) : null,
            status: categoryDoc.status ?? false,
            parentId: categoryDoc.parentId ? categoryDoc.parentId.toString() : null,
            commissionType: CommissionTypes.NONE,
            commissionValue: "",
            commissionStatus: false,
        };
        if (commissionRuleDoc) {
            categoryDetails.commissionType = commissionRuleDoc.commissionType;
            categoryDetails.commissionValue = commissionRuleDoc.commissionValue || "";
            categoryDetails.commissionStatus = commissionRuleDoc.status ?? false;
        }
        return categoryDetails;
    }
    async getAllCategoriesWithDetails(page, limit, search) {
        const filter = { parentId: null };
        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }
        const { categories, total } = await this._categoryRepository.findCategoriesWithDetails({
            filter,
            page,
            limit,
        });
        const mappedData = categories.map((cat) => {
            const categoryWithExtras = cat;
            return {
                id: categoryWithExtras._id.toString(),
                name: categoryWithExtras.name,
                description: categoryWithExtras.description || "",
                iconUrl: categoryWithExtras.iconUrl ? getSignedUrl(categoryWithExtras.iconUrl) : null,
                status: categoryWithExtras.status ?? false,
                parentId: categoryWithExtras.parentId ? categoryWithExtras.parentId.toString() : null,
                subCategoriesCount: categoryWithExtras.subCategoryCount || 0,
                commissionType: categoryWithExtras.commissionRule?.commissionType || CommissionTypes.NONE,
                commissionValue: categoryWithExtras.commissionRule?.commissionValue ?? "",
                commissionStatus: categoryWithExtras.commissionRule?.status ?? false,
            };
        });
        return {
            data: mappedData,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getAllSubcategories(parentId) {
        if (!Types.ObjectId.isValid(parentId)) {
            throw new Error("Invalid parent ID.");
        }
        const subcategoryDocs = await this._categoryRepository.findAll({
            parentId: new Types.ObjectId(parentId),
        });
        const subcategoriesWithRule = await Promise.all(subcategoryDocs.map(async (doc) => {
            const raw = doc.toJSON();
            const commonData = {
                _id: raw._id.toString(),
                name: raw.name,
                description: raw.description || "",
                iconUrl: raw.iconUrl ? getSignedUrl(raw.iconUrl) : null,
                status: raw.status ?? false,
                parentId: raw.parentId ? raw.parentId.toString() : null,
            };
            const commissionRuleDoc = await this._commissionRuleRepository.findOne({
                categoryId: doc._id.toString(),
            });
            const mappedSubCategoryForFrontend = {
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
        }));
        return subcategoriesWithRule;
    }
    async getSubcategories(page, limit, search) {
        const skip = (page - 1) * limit;
        const [services, total] = await Promise.all([
            this._categoryRepository.findAllSubCategories(search, skip, limit),
            this._categoryRepository.countOfSubCategories(search),
        ]);
        const featuredServices = services.map((service) => {
            return {
                id: service._id.toString(),
                name: service.name,
                iconUrl: service.iconUrl ? getSignedUrl(service.iconUrl) : null,
                parentId: service.parentId.toString(),
            };
        });
        return {
            allServices: featuredServices,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }
    async _handleCommissionRuleUpdate(categoryId, commissionRuleInput) {
        if (commissionRuleInput === undefined) {
            const existingRule = await this._commissionRuleRepository.findOne({
                categoryId,
            });
            return existingRule ? toCommissionRuleResponseDTO(existingRule) : null;
        }
        const existingRule = await this._commissionRuleRepository.findOne({
            categoryId,
        });
        if (commissionRuleInput.commissionType === CommissionTypes.NONE) {
            if (existingRule) {
                await this._commissionRuleRepository.delete(existingRule._id.toString());
            }
            return null;
        }
        const resultDoc = await this._commissionRuleRepository.createOrUpdate(categoryId, commissionRuleInput);
        return resultDoc ? toCommissionRuleResponseDTO(resultDoc) : null;
    }
    async _validateParentCategory(categoryId, newParentId) {
        if (newParentId === undefined)
            return;
        if (newParentId !== null) {
            if (!Types.ObjectId.isValid(newParentId)) {
                throw new Error("Invalid parent category ID provided.");
            }
            if (categoryId === newParentId) {
                throw new Error("Category cannot be its own parent.");
            }
            const parentCategory = await this._categoryRepository.findById(newParentId);
            if (!parentCategory) {
                throw new Error("New parent category not found.");
            }
        }
    }
    async _validateNameUniqueness(categoryId, updateData, existingCategory) {
        if (!updateData.name || updateData.name === existingCategory.name) {
            return;
        }
        const targetParentId = updateData.parentId !== undefined ? updateData.parentId : existingCategory.parentId;
        const existingWithNewName = targetParentId
            ? await this._categoryRepository.findByNameAndParent(updateData.name, targetParentId)
            : await this._categoryRepository.findByName(updateData.name);
        if (existingWithNewName && existingWithNewName._id.toString() !== categoryId) {
            const message = targetParentId
                ? "A subcategory with this name already exists under the specified parent."
                : "A top-level category with this name already exists.";
            throw new Error(message);
        }
    }
    async getCommissionSummary() {
        const now = new Date();
        const currentPeriodStart = startOfDay(subDays(now, 30));
        const currentPeriodEnd = endOfDay(now);
        const previousPeriodStart = startOfDay(subDays(now, 60));
        const previousPeriodEnd = endOfDay(subDays(now, 31));
        const [currentPayments, previousPayments, currentBookingsCount, previousBookingsCount] = await Promise.all([
            this._paymentRepository.getTotalsInDateRange(currentPeriodStart, currentPeriodEnd),
            this._paymentRepository.getTotalsInDateRange(previousPeriodStart, previousPeriodEnd),
            this._bookingRepository.countInDateRange(currentPeriodStart, currentPeriodEnd),
            this._bookingRepository.countInDateRange(previousPeriodStart, previousPeriodEnd),
        ]);
        const calculateChange = (current, previous) => {
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
            commissionDeductionsToProvidersChange: calculateChange(currentPayments.totalProviderAmount, previousPayments.totalProviderAmount),
        };
    }
    async getTopLevelCategories() {
        const categories = await this._categoryRepository.findAll({
            parentId: null,
            status: true,
        });
        return categories.map(toCategoryResponseDTO);
    }
    async getPopularServices() {
        const services = await this._categoryRepository.findActiveSubCategories(-1, 0, 5);
        return services.map((s) => ({
            id: s._id.toString(),
            name: s.name,
            iconUrl: s.iconUrl ? getSignedUrl(s.iconUrl) : null,
            parentId: s.parentId.toString(),
            description: s.description || "",
        }));
    }
    async getTrendingServices() {
        const services = await this._categoryRepository.findActiveSubCategories(-1, 5, 6);
        return services.map((s) => ({
            id: s._id.toString(),
            name: s.name,
            iconUrl: s.iconUrl ? getSignedUrl(s.iconUrl) : null,
            parentId: s.parentId.toString(),
            description: s.description || "",
        }));
    }
    async getTopLevelCategoryNames() {
        const categories = await this._categoryRepository.findAll({
            parentId: null,
            status: true,
        });
        return categories.map((cat) => cat.name);
    }
    async getSubcategoriesForCategory(parentCategoryName) {
        const parentCategory = await this._categoryRepository.findOne({
            name: { $regex: new RegExp(`^${parentCategoryName}$`, "i") },
            parentId: null,
        });
        if (!parentCategory) {
            return [];
        }
        const subCategories = await this._categoryRepository.findAll({
            parentId: parentCategory._id,
            status: true,
        });
        return subCategories.map((cat) => cat.name);
    }
    async getRelatedCategories(categoryId) {
        const currentCategory = await this._categoryRepository.findById(categoryId);
        if (!currentCategory || !currentCategory.parentId) {
            return [];
        }
        const related = await this._categoryRepository.findRelatedCategories(currentCategory.parentId.toString(), categoryId, 4);
        return related.map((cat) => ({
            id: cat._id.toString(),
            name: cat.name,
            description: cat.description || "",
            iconUrl: cat.iconUrl ? getSignedUrl(cat.iconUrl) : "",
            parentId: cat.parentId?.toString() || null,
        }));
    }
};
CategoryService = __decorate([
    injectable(),
    __param(0, inject(TYPES.CategoryRepository)),
    __param(1, inject(TYPES.CommissionRuleRepository)),
    __param(2, inject(TYPES.PaymentRepository)),
    __param(3, inject(TYPES.BookingRepository)),
    __metadata("design:paramtypes", [Object, Object, Object, Object])
], CategoryService);
export { CategoryService };
