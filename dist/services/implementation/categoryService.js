"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryService = void 0;
const mongoose_1 = require("mongoose");
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../../di/type"));
const CommissionType_enum_1 = require("../../enums/CommissionType.enum");
const CustomError_1 = require("../../utils/CustomError");
const HttpStatusCode_1 = require("../../enums/HttpStatusCode");
const category_mapper_1 = require("../../utils/mappers/category.mapper");
const date_fns_1 = require("date-fns");
let CategoryService = class CategoryService {
    constructor(categoryRepository, commissionRuleRepository, paymentRepository, bookingRepository) {
        this._categoryRepository = categoryRepository;
        this._commissionRuleRepository = commissionRuleRepository;
        this._paymentRepository = paymentRepository;
        this._bookingRepository = bookingRepository;
    }
    createCategory(categoryInput, commissionRuleInput) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (categoryInput.parentId) {
                const parentCategory = yield this._categoryRepository.findOne({ _id: categoryInput.parentId });
                if (!parentCategory) {
                    throw new CustomError_1.CustomError('Parent category not found.', HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
                }
                const existingSubcategory = yield this._categoryRepository.findSubCatByName(categoryInput.name);
                if (existingSubcategory) {
                    throw new CustomError_1.CustomError('A subcategory with this name already exists under the parent.', HttpStatusCode_1.HttpStatusCode.CONFLICT);
                }
            }
            else {
                const existingTopLevelCategory = yield this._categoryRepository.findByName(categoryInput.name);
                if (existingTopLevelCategory) {
                    throw new CustomError_1.CustomError('A top-level category with this name already exists.', HttpStatusCode_1.HttpStatusCode.CONFLICT);
                }
            }
            const categoryDataToCreate = Object.assign(Object.assign({}, categoryInput), { parentId: categoryInput.parentId
                    ? new mongoose_1.Types.ObjectId(categoryInput.parentId)
                    : null, status: (_a = categoryInput.status) !== null && _a !== void 0 ? _a : true });
            const createdCategoryDoc = yield this._categoryRepository.create(categoryDataToCreate);
            const categoryResponse = createdCategoryDoc.toJSON();
            let createdCommissionRule;
            const ruleData = {
                categoryId: createdCategoryDoc._id ? new mongoose_1.Types.ObjectId(createdCategoryDoc._id) : null,
                commissionType: commissionRuleInput.commissionType,
                commissionValue: commissionRuleInput.commissionValue,
                status: (_b = commissionRuleInput.status) !== null && _b !== void 0 ? _b : true,
            };
            const newRule = yield this._commissionRuleRepository.create(ruleData);
            createdCommissionRule = newRule.toJSON();
            return { category: categoryResponse, commissionRule: createdCommissionRule };
        });
    }
    updateCategory(categoryId, updateData, commissionRuleData) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingCategory = yield this._categoryRepository.findById(categoryId);
            if (!existingCategory) {
                throw new Error('Category not found.');
            }
            yield this._validateParentCategory(categoryId, updateData.parentId);
            yield this._validateNameUniqueness(categoryId, updateData, existingCategory);
            const updatedCategoryDoc = yield this._categoryRepository.update(categoryId, updateData);
            const updatedCategory = updatedCategoryDoc ? (0, category_mapper_1.toCategoryResponseDTO)(updatedCategoryDoc) : null;
            let updatedCommissionRule = yield this._handleCommissionRuleUpdate(categoryId, commissionRuleData);
            if (updateData.status !== undefined) {
                const newStatus = updateData.status;
                yield this._commissionRuleRepository.updateStatusForCategoryIds([existingCategory._id], newStatus);
                if (!existingCategory.parentId) {
                    const subcategoryIds = yield this._categoryRepository.findSubcategoryIds(categoryId.toString());
                    if (subcategoryIds.length > 0) {
                        yield this._categoryRepository.updateStatusForIds(subcategoryIds, newStatus);
                        yield this._commissionRuleRepository.updateStatusForCategoryIds(subcategoryIds, newStatus);
                    }
                }
                const rule = yield this._commissionRuleRepository.findOne({ categoryId });
                updatedCommissionRule = rule ? (0, category_mapper_1.toCommissionRuleResponseDTO)(rule) : null;
            }
            return { category: updatedCategory, commissionRule: updatedCommissionRule };
        });
    }
    updateManySubcategoriesStatus(parentCategoryId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._categoryRepository.updateSubcategoriesStatus(parentCategoryId, status);
        });
    }
    getCategoryById(categoryId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const [categoryDoc, commissionRuleDoc, subCategoryDocs] = yield Promise.all([
                this._categoryRepository.findById(categoryId),
                this._commissionRuleRepository.findOne({ categoryId: categoryId }),
                this._categoryRepository.findAll({ parentId: new mongoose_1.Types.ObjectId(categoryId) })
            ]);
            if (!categoryDoc) {
                throw new Error('Category not found.');
            }
            const categoryDetails = {
                id: categoryDoc._id.toString(),
                name: categoryDoc.name,
                description: categoryDoc.description || '',
                iconUrl: categoryDoc.iconUrl || null,
                status: (_a = categoryDoc.status) !== null && _a !== void 0 ? _a : false,
                parentId: categoryDoc.parentId ? categoryDoc.parentId.toString() : null,
                commissionType: (commissionRuleDoc === null || commissionRuleDoc === void 0 ? void 0 : commissionRuleDoc.commissionType) || CommissionType_enum_1.CommissionTypes.NONE,
                commissionValue: (_b = commissionRuleDoc === null || commissionRuleDoc === void 0 ? void 0 : commissionRuleDoc.commissionValue) !== null && _b !== void 0 ? _b : '',
                commissionStatus: (_c = commissionRuleDoc === null || commissionRuleDoc === void 0 ? void 0 : commissionRuleDoc.status) !== null && _c !== void 0 ? _c : false,
            };
            const subCategoryIds = subCategoryDocs.map(sub => sub._id);
            let allSubCategoryRules = [];
            if (subCategoryIds.length > 0) {
                allSubCategoryRules = yield this._commissionRuleRepository.findAll({
                    categoryId: { $in: subCategoryIds }
                });
            }
            const commissionRulesMap = new Map(allSubCategoryRules.map(rule => [rule.categoryId.toString(), rule]));
            const subCategories = subCategoryDocs.map((sub) => {
                var _a, _b, _c;
                const subRule = commissionRulesMap.get(sub._id.toString());
                return {
                    id: sub._id.toString(),
                    name: sub.name,
                    description: sub.description || '',
                    iconUrl: sub.iconUrl || null,
                    status: (_a = sub.status) !== null && _a !== void 0 ? _a : false,
                    parentId: sub.parentId ? sub.parentId.toString() : null,
                    commissionType: (subRule === null || subRule === void 0 ? void 0 : subRule.commissionType) || CommissionType_enum_1.CommissionTypes.NONE,
                    commissionValue: (_b = subRule === null || subRule === void 0 ? void 0 : subRule.commissionValue) !== null && _b !== void 0 ? _b : '',
                    commissionStatus: (_c = subRule === null || subRule === void 0 ? void 0 : subRule.status) !== null && _c !== void 0 ? _c : false,
                };
            });
            return {
                categoryDetails,
                subCategories
            };
        });
    }
    getCategoryForEdit(categoryId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const [categoryDoc, commissionRuleDoc] = yield Promise.all([
                this._categoryRepository.findById(categoryId),
                this._commissionRuleRepository.findOne({ categoryId: categoryId })
            ]);
            if (!categoryDoc) {
                throw new Error('Category not found.');
            }
            const categoryDetails = {
                id: categoryDoc._id.toString(),
                name: categoryDoc.name,
                description: categoryDoc.description || '',
                iconUrl: categoryDoc.iconUrl || null,
                status: (_a = categoryDoc.status) !== null && _a !== void 0 ? _a : false,
                parentId: categoryDoc.parentId ? categoryDoc.parentId.toString() : null,
                commissionType: CommissionType_enum_1.CommissionTypes.NONE,
                commissionValue: '',
                commissionStatus: false,
            };
            if (commissionRuleDoc) {
                categoryDetails.commissionType = commissionRuleDoc.commissionType;
                categoryDetails.commissionValue = commissionRuleDoc.commissionValue || '';
                categoryDetails.commissionStatus = (_b = commissionRuleDoc.status) !== null && _b !== void 0 ? _b : false;
            }
            return categoryDetails;
        });
    }
    getAllCategoriesWithDetails(page, limit, search) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = { parentId: null };
            if (search) {
                filter.name = { $regex: search, $options: 'i' };
            }
            const { categories, total } = yield this._categoryRepository.findCategoriesWithDetails({
                filter,
                page,
                limit
            });
            const mappedData = categories.map(cat => {
                var _a, _b, _c, _d, _e;
                const categoryWithExtras = cat;
                return {
                    id: categoryWithExtras._id.toString(),
                    name: categoryWithExtras.name,
                    description: categoryWithExtras.description || '',
                    iconUrl: categoryWithExtras.iconUrl || null,
                    status: (_a = categoryWithExtras.status) !== null && _a !== void 0 ? _a : false,
                    parentId: categoryWithExtras.parentId ? categoryWithExtras.parentId.toString() : null,
                    subCategoriesCount: categoryWithExtras.subCategoryCount || 0,
                    commissionType: ((_b = categoryWithExtras.commissionRule) === null || _b === void 0 ? void 0 : _b.commissionType) || CommissionType_enum_1.CommissionTypes.NONE,
                    commissionValue: ((_c = categoryWithExtras.commissionRule) === null || _c === void 0 ? void 0 : _c.commissionValue) || '',
                    commissionStatus: (_e = (_d = categoryWithExtras.commissionRule) === null || _d === void 0 ? void 0 : _d.status) !== null && _e !== void 0 ? _e : false,
                };
            });
            return {
                data: mappedData,
                total,
                totalPages: Math.ceil(total / limit)
            };
        });
    }
    getAllSubcategories(parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!mongoose_1.Types.ObjectId.isValid(parentId)) {
                throw new Error('Invalid parent ID.');
            }
            const subcategoryDocs = yield this._categoryRepository.findAll({
                parentId: new mongoose_1.Types.ObjectId(parentId),
            });
            const subcategoriesWithRule = yield Promise.all(subcategoryDocs.map((doc) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                const raw = doc.toJSON();
                const commonData = {
                    _id: raw._id.toString(),
                    name: raw.name,
                    description: raw.description || '',
                    iconUrl: raw.iconUrl || null,
                    status: (_a = raw.status) !== null && _a !== void 0 ? _a : false,
                    parentId: raw.parentId ? raw.parentId.toString() : null,
                };
                const commissionRuleDoc = yield this._commissionRuleRepository.findOne({ categoryId: doc._id.toString() });
                const mappedSubCategoryForFrontend = Object.assign(Object.assign({}, commonData), { commissionType: CommissionType_enum_1.CommissionTypes.NONE, commissionValue: 0, commissionStatus: false });
                if (commissionRuleDoc) {
                    mappedSubCategoryForFrontend.commissionType = commissionRuleDoc.commissionType;
                    mappedSubCategoryForFrontend.commissionValue = commissionRuleDoc.commissionValue;
                    mappedSubCategoryForFrontend.commissionStatus = (_b = commissionRuleDoc.status) !== null && _b !== void 0 ? _b : false;
                }
                return Object.assign({}, mappedSubCategoryForFrontend);
            })));
            return subcategoriesWithRule;
        });
    }
    getSubcategories(page, limit, search) {
        return __awaiter(this, void 0, void 0, function* () {
            const skip = (page - 1) * limit;
            const [services, total] = yield Promise.all([
                this._categoryRepository.findAllSubCategories(search, skip, limit),
                this._categoryRepository.countOfSubCategories(search),
            ]);
            const featuredServices = services.map(service => {
                return {
                    id: service._id.toString(),
                    name: service.name,
                    iconUrl: service.iconUrl,
                    parentId: service.parentId.toString()
                };
            });
            return {
                allServices: featuredServices,
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
            };
        });
    }
    _handleCommissionRuleUpdate(categoryId, commissionRuleInput) {
        return __awaiter(this, void 0, void 0, function* () {
            if (commissionRuleInput === undefined) {
                const existingRule = yield this._commissionRuleRepository.findOne({ categoryId });
                return existingRule ? (0, category_mapper_1.toCommissionRuleResponseDTO)(existingRule) : null;
            }
            const existingRule = yield this._commissionRuleRepository.findOne({ categoryId });
            if (commissionRuleInput.commissionType === CommissionType_enum_1.CommissionTypes.NONE) {
                if (existingRule) {
                    yield this._commissionRuleRepository.delete(existingRule._id.toString());
                }
                return null;
            }
            const resultDoc = yield this._commissionRuleRepository.createOrUpdate(categoryId, commissionRuleInput);
            return resultDoc ? (0, category_mapper_1.toCommissionRuleResponseDTO)(resultDoc) : null;
        });
    }
    _validateParentCategory(categoryId, newParentId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (newParentId === undefined)
                return;
            if (newParentId !== null) {
                if (!mongoose_1.Types.ObjectId.isValid(newParentId)) {
                    throw new Error('Invalid parent category ID provided.');
                }
                if (categoryId === newParentId) {
                    throw new Error('Category cannot be its own parent.');
                }
                const parentCategory = yield this._categoryRepository.findById(newParentId);
                if (!parentCategory) {
                    throw new Error('New parent category not found.');
                }
            }
        });
    }
    _validateNameUniqueness(categoryId, updateData, existingCategory) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!updateData.name || updateData.name === existingCategory.name) {
                return;
            }
            const targetParentId = updateData.parentId !== undefined ? updateData.parentId : existingCategory.parentId;
            const existingWithNewName = targetParentId
                ? yield this._categoryRepository.findByNameAndParent(updateData.name, targetParentId)
                : yield this._categoryRepository.findByName(updateData.name);
            if (existingWithNewName && existingWithNewName._id.toString() !== categoryId) {
                const message = targetParentId
                    ? 'A subcategory with this name already exists under the specified parent.'
                    : 'A top-level category with this name already exists.';
                throw new Error(message);
            }
        });
    }
    getCommissionSummary() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const currentPeriodStart = (0, date_fns_1.startOfDay)((0, date_fns_1.subDays)(now, 30));
            const currentPeriodEnd = (0, date_fns_1.endOfDay)(now);
            const previousPeriodStart = (0, date_fns_1.startOfDay)((0, date_fns_1.subDays)(now, 60));
            const previousPeriodEnd = (0, date_fns_1.endOfDay)((0, date_fns_1.subDays)(now, 31));
            const [currentPayments, previousPayments, currentBookingsCount, previousBookingsCount] = yield Promise.all([
                this._paymentRepository.getTotalsInDateRange(currentPeriodStart, currentPeriodEnd),
                this._paymentRepository.getTotalsInDateRange(previousPeriodStart, previousPeriodEnd),
                this._bookingRepository.countInDateRange(currentPeriodStart, currentPeriodEnd),
                this._bookingRepository.countInDateRange(previousPeriodStart, previousPeriodEnd)
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
                commissionDeductionsToProvidersChange: calculateChange(currentPayments.totalProviderAmount, previousPayments.totalProviderAmount)
            };
        });
    }
    getTopLevelCategories() {
        return __awaiter(this, void 0, void 0, function* () {
            const categories = yield this._categoryRepository.findAll({
                parentId: null,
                status: true
            });
            return categories.map(category_mapper_1.toCategoryResponseDTO);
        });
    }
    getPopularServices() {
        return __awaiter(this, void 0, void 0, function* () {
            const services = yield this._categoryRepository.findActiveSubCategories({ createdAt: -1 }, 0, 5);
            return services.map(s => ({
                id: s._id.toString(),
                name: s.name,
                iconUrl: s.iconUrl,
                parentId: s.parentId.toString(),
                description: s.description || '',
            }));
        });
    }
    getTrendingServices() {
        return __awaiter(this, void 0, void 0, function* () {
            const services = yield this._categoryRepository.findActiveSubCategories({ createdAt: -1 }, 5, 6);
            return services.map(s => ({
                id: s._id.toString(),
                name: s.name,
                iconUrl: s.iconUrl,
                parentId: s.parentId.toString(),
                description: s.description || '',
            }));
        });
    }
    getTopLevelCategoryNames() {
        return __awaiter(this, void 0, void 0, function* () {
            const categories = yield this._categoryRepository.findAll({
                parentId: null,
                status: true
            });
            return categories.map(cat => cat.name);
        });
    }
    getSubcategoriesForCategory(parentCategoryName) {
        return __awaiter(this, void 0, void 0, function* () {
            const parentCategory = yield this._categoryRepository.findOne({
                name: { $regex: new RegExp(`^${parentCategoryName}$`, 'i') },
                parentId: null
            });
            if (!parentCategory) {
                return [];
            }
            const subCategories = yield this._categoryRepository.findAll({
                parentId: parentCategory._id,
                status: true
            });
            return subCategories.map(cat => cat.name);
        });
    }
};
exports.CategoryService = CategoryService;
exports.CategoryService = CategoryService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.CategoryRepository)),
    __param(1, (0, inversify_1.inject)(type_1.default.CommissionRuleRepository)),
    __param(2, (0, inversify_1.inject)(type_1.default.PaymentRepository)),
    __param(3, (0, inversify_1.inject)(type_1.default.BookingRepository)),
    __metadata("design:paramtypes", [Object, Object, Object, Object])
], CategoryService);
