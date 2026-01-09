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
import {} from "express";
import {} from "../interface/category.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";
import * as fsPromises from "fs/promises";
import { inject, injectable } from "inversify";
import TYPES from "../di/type.js";
import {} from "../services/interface/ICategoryService.js";
import { HttpStatusCode } from "../enums/HttpStatusCode.js";
import logger from "../logger/logger.js";
import { ZodError } from "zod";
import { createCategorySchema, updateCategorySchema, paramIdSchema, getSubcategoriesQuerySchema, } from "../utils/validations/category.validation.js";
let CategoryController = class CategoryController {
    _categoryService;
    constructor(categoryService) {
        this._categoryService = categoryService;
    }
    createCategory = async (req, res, next) => {
        try {
            const validatedBody = createCategorySchema.parse(req.body);
            const { name, description, status, parentId, commissionType, commissionValue, commissionStatus } = validatedBody;
            let iconUrl;
            if (req.file) {
                const fullUrl = await uploadToCloudinary(req.file.path);
                iconUrl = fullUrl.replace(process.env.CLOUDINARY_BASE_URL, "");
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
            const { category, commissionRule } = await this._categoryService.createCategory(categoryInput, commissionRuleInput);
            res.status(HttpStatusCode.CREATED).json({
                message: `${category.parentId ? "Subcategory" : "Category"} created successfully`,
                category,
                commissionRule,
            });
        }
        catch (error) {
            logger.error("Error in createCategory controller:", error);
            if (req.file?.path) {
                await fsPromises
                    .unlink(req.file.path)
                    .catch((err) => logger.error("Failed to delete temp file on error:", err));
            }
            if (error instanceof ZodError) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "Validation failed",
                    errors: error.issues,
                });
            }
            if (error.message.includes("already exists")) {
                res.status(HttpStatusCode.CONFLICT).json({ message: error.message });
            }
            next(error);
        }
    };
    updateCategory = async (req, res, next) => {
        try {
            const { id } = paramIdSchema.parse(req.params);
            const validatedBody = updateCategorySchema.parse(req.body);
            const { name, description, status, parentId, commissionType, commissionValue, commissionStatus } = validatedBody;
            let iconUrl = req.body.iconUrl;
            if (req.file) {
                const fullUrl = await uploadToCloudinary(req.file.path);
                iconUrl = fullUrl.replace(process.env.CLOUDINARY_BASE_URL, "");
            }
            else if (req.body.iconUrl === "") {
                iconUrl = null;
            }
            const updateCategoryData = {
                name,
                description,
                status,
                iconUrl,
                parentId: parentId === "" ? null : parentId,
            };
            const commissionRuleInput = {
                commissionType,
                commissionValue,
                status: commissionStatus,
            };
            const { category, commissionRule } = await this._categoryService.updateCategory(id, updateCategoryData, commissionRuleInput);
            res.status(HttpStatusCode.OK).json({
                message: `${category.parentId ? "Subcategory" : "Category"} updated successfully`,
                category,
                commissionRule,
            });
        }
        catch (error) {
            if (req.file?.path) {
                await fsPromises
                    .unlink(req.file.path)
                    .catch((err) => logger.error("Failed to delete temp file on error:", err));
            }
            if (error instanceof ZodError) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            }
            if (error.message.includes("not found")) {
                res.status(HttpStatusCode.NOT_FOUND).json({ message: error.message });
            }
            if (error.message.includes("already exists")) {
                res.status(HttpStatusCode.CONFLICT).json({ message: error.message });
            }
            next(error);
        }
    };
    getCategoryById = async (req, res, next) => {
        try {
            const { id } = paramIdSchema.parse(req.params);
            const responseData = await this._categoryService.getCategoryById(id);
            res.status(HttpStatusCode.OK).json(responseData);
        }
        catch (error) {
            if (error instanceof ZodError) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            }
            if (error.message.includes("Category not found")) {
                res.status(HttpStatusCode.NOT_FOUND).json({ message: error.message });
            }
            next(error);
        }
    };
    getCategoryForEdit = async (req, res, next) => {
        try {
            const { id } = paramIdSchema.parse(req.params);
            const categoryData = await this._categoryService.getCategoryForEdit(id);
            res.status(HttpStatusCode.OK).json(categoryData);
        }
        catch (error) {
            if (error instanceof ZodError) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            }
            if (error.message.includes("Category not found")) {
                res.status(HttpStatusCode.NOT_FOUND).json({ message: error.message });
            }
            next(error);
        }
    };
    getAllCategories = async (req, res, next) => {
        try {
            const { page = 1, limit = 10, search } = getSubcategoriesQuerySchema.parse(req.query);
            const response = await this._categoryService.getAllCategoriesWithDetails(page, limit, search);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            if (error instanceof ZodError) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            }
            next(error);
        }
    };
    getSubCategories = async (req, res, next) => {
        try {
            const { page = 1, limit = 10, search = "" } = getSubcategoriesQuerySchema.parse(req.query);
            const allSubCategories = await this._categoryService.getSubcategories(page, limit, search);
            res.status(HttpStatusCode.OK).json(allSubCategories);
        }
        catch (error) {
            if (error instanceof ZodError) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            }
            next(error);
        }
    };
    getCommissionSummary = async (req, res, next) => {
        try {
            const response = await this._categoryService.getCommissionSummary();
            res.status(HttpStatusCode.OK).json({ success: true, data: response });
        }
        catch (error) {
            next(error);
        }
    };
    getTopLevelCategories = async (req, res, next) => {
        try {
            const response = await this._categoryService.getTopLevelCategories();
            res.status(HttpStatusCode.OK).json({ success: true, data: response });
        }
        catch (error) {
            next(error);
        }
    };
    getPopularServices = async (req, res, next) => {
        try {
            const response = await this._categoryService.getPopularServices();
            res.status(HttpStatusCode.OK).json({ success: true, data: response });
        }
        catch (error) {
            next(error);
        }
    };
    getTrendingServices = async (req, res, next) => {
        try {
            const response = await this._categoryService.getTrendingServices();
            res.status(HttpStatusCode.OK).json({ success: true, data: response });
        }
        catch (error) {
            next(error);
        }
    };
    getRelatedCategories = async (req, res, next) => {
        try {
            const { id } = paramIdSchema.parse(req.params);
            const related = await this._categoryService.getRelatedCategories(id);
            res.status(HttpStatusCode.OK).json({ success: true, data: related });
        }
        catch (error) {
            next(error);
        }
    };
};
CategoryController = __decorate([
    injectable(),
    __param(0, inject(TYPES.CategoryService)),
    __metadata("design:paramtypes", [Object])
], CategoryController);
export { CategoryController };
