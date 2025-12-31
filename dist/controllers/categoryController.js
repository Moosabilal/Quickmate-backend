"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.CategoryController = void 0;
const cloudinaryUpload_1 = require("../utils/cloudinaryUpload");
const fsPromises = __importStar(require("fs/promises"));
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../di/type"));
const HttpStatusCode_1 = require("../enums/HttpStatusCode");
const logger_1 = __importDefault(require("../logger/logger"));
const zod_1 = require("zod");
const category_validation_1 = require("../utils/validations/category.validation");
let CategoryController = class CategoryController {
    constructor(categoryService) {
        this.createCategory = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const validatedBody = category_validation_1.createCategorySchema.parse(req.body);
                const { name, description, status, parentId, commissionType, commissionValue, commissionStatus } = validatedBody;
                let iconUrl;
                if (req.file) {
                    const fullUrl = yield (0, cloudinaryUpload_1.uploadToCloudinary)(req.file.path);
                    iconUrl = fullUrl.replace(process.env.CLOUDINARY_BASE_URL, '');
                }
                const categoryInput = {
                    name,
                    description,
                    status,
                    iconUrl,
                    parentId: parentId || null,
                };
                const commissionRuleInput = {
                    commissionType,
                    commissionValue,
                    status: commissionStatus,
                };
                const { category, commissionRule } = yield this._categoryService.createCategory(categoryInput, commissionRuleInput);
                res.status(HttpStatusCode_1.HttpStatusCode.CREATED).json({
                    message: `${category.parentId ? 'Subcategory' : 'Category'} created successfully`,
                    category,
                    commissionRule,
                });
            }
            catch (error) {
                logger_1.default.error('Error in createCategory controller:', error);
                if ((_a = req.file) === null || _a === void 0 ? void 0 : _a.path) {
                    yield fsPromises.unlink(req.file.path).catch(err => logger_1.default.error("Failed to delete temp file on error:", err));
                }
                if (error instanceof zod_1.ZodError) {
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({
                        success: false,
                        message: "Validation failed",
                        errors: error.issues
                    });
                }
                if (error.message.includes('already exists')) {
                    res.status(HttpStatusCode_1.HttpStatusCode.CONFLICT).json({ message: error.message });
                }
                next(error);
            }
        });
        this.updateCategory = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = category_validation_1.paramIdSchema.parse(req.params);
                const validatedBody = category_validation_1.updateCategorySchema.parse(req.body);
                const { name, description, status, parentId, commissionType, commissionValue, commissionStatus } = validatedBody;
                let iconUrl = req.body.iconUrl;
                if (req.file) {
                    const fullUrl = yield (0, cloudinaryUpload_1.uploadToCloudinary)(req.file.path);
                    iconUrl = fullUrl.replace(process.env.CLOUDINARY_BASE_URL, '');
                }
                else if (req.body.iconUrl === '') {
                    iconUrl = null;
                }
                const updateCategoryData = {
                    name,
                    description,
                    status,
                    iconUrl,
                    parentId: parentId === '' ? null : parentId,
                };
                const commissionRuleInput = {
                    commissionType,
                    commissionValue,
                    status: commissionStatus,
                };
                const { category, commissionRule } = yield this._categoryService.updateCategory(id, updateCategoryData, commissionRuleInput);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({
                    message: `${category.parentId ? 'Subcategory' : 'Category'} updated successfully`,
                    category,
                    commissionRule,
                });
            }
            catch (error) {
                if ((_a = req.file) === null || _a === void 0 ? void 0 : _a.path) {
                    yield fsPromises.unlink(req.file.path).catch(err => logger_1.default.error("Failed to delete temp file on error:", err));
                }
                if (error instanceof zod_1.ZodError) {
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                }
                if (error.message.includes('not found')) {
                    res.status(HttpStatusCode_1.HttpStatusCode.NOT_FOUND).json({ message: error.message });
                }
                if (error.message.includes('already exists')) {
                    res.status(HttpStatusCode_1.HttpStatusCode.CONFLICT).json({ message: error.message });
                }
                next(error);
            }
        });
        this.getCategoryById = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = category_validation_1.paramIdSchema.parse(req.params);
                const responseData = yield this._categoryService.getCategoryById(id);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(responseData);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                }
                if (error.message.includes('Category not found')) {
                    res.status(HttpStatusCode_1.HttpStatusCode.NOT_FOUND).json({ message: error.message });
                }
                next(error);
            }
        });
        this.getCategoryForEdit = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = category_validation_1.paramIdSchema.parse(req.params);
                const categoryData = yield this._categoryService.getCategoryForEdit(id);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(categoryData);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                }
                if (error.message.includes('Category not found')) {
                    res.status(HttpStatusCode_1.HttpStatusCode.NOT_FOUND).json({ message: error.message });
                }
                next(error);
            }
        });
        this.getAllCategories = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = 1, limit = 10, search } = category_validation_1.getSubcategoriesQuerySchema.parse(req.query);
                const response = yield this._categoryService.getAllCategoriesWithDetails(page, limit, search);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                }
                next(error);
            }
        });
        this.getSubCategories = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = 1, limit = 10, search = '' } = category_validation_1.getSubcategoriesQuerySchema.parse(req.query);
                const allSubCategories = yield this._categoryService.getSubcategories(page, limit, search);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(allSubCategories);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                }
                next(error);
            }
        });
        this.getCommissionSummary = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this._categoryService.getCommissionSummary();
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({ success: true, data: response });
            }
            catch (error) {
                next(error);
            }
        });
        this.getTopLevelCategories = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this._categoryService.getTopLevelCategories();
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({ success: true, data: response });
            }
            catch (error) {
                next(error);
            }
        });
        this.getPopularServices = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this._categoryService.getPopularServices();
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({ success: true, data: response });
            }
            catch (error) {
                next(error);
            }
        });
        this.getTrendingServices = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this._categoryService.getTrendingServices();
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({ success: true, data: response });
            }
            catch (error) {
                next(error);
            }
        });
        this.getRelatedCategories = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = category_validation_1.paramIdSchema.parse(req.params);
                const related = yield this._categoryService.getRelatedCategories(id);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({ success: true, data: related });
            }
            catch (error) {
                next(error);
            }
        });
        this._categoryService = categoryService;
    }
};
exports.CategoryController = CategoryController;
exports.CategoryController = CategoryController = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.CategoryService)),
    __metadata("design:paramtypes", [Object])
], CategoryController);
